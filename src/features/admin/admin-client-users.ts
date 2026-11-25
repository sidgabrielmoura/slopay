import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { companyAccessStatus, companyPage, companySearch, companyStatusFilter } from "./admin-companies";
import { adminPaginationSchema } from "./admin-pending";

export const clientUsersPath = "/admin/usuarios";
export const clientUsersUnavailable = "Não foi possível consultar os usuários credenciados.";
export const clientUserUnavailable = "Não foi possível consultar este usuário.";
const api = "/api/admin/client-users";
const roles = z.enum(["MERCHANT", "OPERATOR", "AUDITOR"]);
const date = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
const version = count.max(2_147_483_647);

export const clientUserRoleFilter = z.enum(["ALL", ...roles.options]);
export const clientUserQuery = z.strictObject({
  search: companySearch.default(""), role: clientUserRoleFilter.default("ALL"),
  status: companyStatusFilter.default("ALL"), page: companyPage.default(1),
});

const clientUser = z.object({
  id: z.uuid(), name: z.string(), email: z.string(), role: roles, status: companyAccessStatus, lastLoginAt: date.nullable(),
  company: z.object({ id: z.uuid(), legalName: z.string(), tradeName: z.string().nullable() }).nullable(),
});
export const clientUserDetailSchema = clientUser.extend({
  createdAt: date, emailVerified: z.boolean(), mfaEnabled: z.boolean(), passkeyRegistered: z.boolean(),
  cpfEnding: z.string().regex(/^\d{2}$/).nullable(), phoneEnding: z.string().regex(/^\d{4}$/).nullable(),
  accessVersion: count.max(2_000_000_000).nullable(),
  sandboxPilot: z.boolean().optional(),
  closedAt: date.nullish(),
  closureVersion: version.nullish(),
  closureFinancialPending: z.boolean().optional(),
  deletion: z.union([
    z.object({ version }),
    z.object({ blocked: z.enum(["LINKED", "HISTORY"]), hasFinancialHistory: z.boolean().optional() }),
  ]).optional(),
});
export const clientUsersSchema = z.object({
  summary: z.object({ total: count, active: count, pending: count, restricted: count }),
  items: z.array(clientUser).max(8), pagination: adminPaginationSchema,
});

export type ClientUser = z.infer<typeof clientUser>;
export type ClientUserDetail = z.infer<typeof clientUserDetailSchema>;
export type ClientUserQuery = z.infer<typeof clientUserQuery>;
export type ClientUserSummary = z.infer<typeof clientUsersSchema>["summary"];

const deletionConfirmation = z.string().max(1024).regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
export const clientUserDeletionSchema = z.strictObject({
  version,
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u),
});
export const clientUserDeletionOptions = passkeyOptionsSchema.extend({ confirmation: deletionConfirmation });
export const clientUserDeletionRequest = clientUserDeletionSchema.extend({
  confirmation: deletionConfirmation, proof: integrationProofSchema,
});
export const clientUserDeletedSchema = z.object({ deleted: z.literal(true) });
export const clientUserClosedSchema = z.object({ closed: z.literal(true) });
export type ClientUserDeletion = z.infer<typeof clientUserDeletionSchema>;
export type ClientUserDeletionOptions = z.infer<typeof clientUserDeletionOptions>;

export const clientUserRoleLabels = { ALL: "Todos os perfis", MERCHANT: "Titular", OPERATOR: "Operador", AUDITOR: "Auditor" } as const;

export function clientUserQueryFrom(params: Pick<URLSearchParams, "get">): ClientUserQuery {
  return {
    search: companySearch.catch("").parse(params.get("search")),
    role: clientUserRoleFilter.catch("ALL").parse(params.get("role")),
    status: companyStatusFilter.catch("ALL").parse(params.get("status")),
    page: companyPage.catch(1).parse(params.get("page")),
  };
}

export function clientUserParams(query: ClientUserQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role !== "ALL") params.set("role", query.role);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function clientUsersHref(query: ClientUserQuery) {
  const params = clientUserParams(query);
  return clientUsersPath + (params.size ? "?" + params : "");
}

function deletionPost(body: object) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function adminAccountTermination(company: boolean, operation: "close" | "delete") {
  const endpoint = company ? "/api/admin/companies" : api;
  return {
    options: (id: string, input: ClientUserDeletion) =>
      requestPixGateway(`${endpoint}/${id}/${operation}/options`, clientUserDeletionOptions,
        "Não foi possível preparar a operação.", deletionPost(input)),
    apply: (id: string, input: ClientUserDeletion, confirmation: string, proof: IntegrationProof) =>
      requestPixGateway(`${endpoint}/${id}/${operation}`, z.union([clientUserClosedSchema, clientUserDeletedSchema]),
        "Não foi possível confirmar a operação.", deletionPost({ ...input, confirmation, proof })),
  };
}

export const adminClientUsers = {
  list: (query: ClientUserQuery, signal: AbortSignal) =>
    requestPixGateway(api + "?" + clientUserParams(query), clientUsersSchema, clientUsersUnavailable, { signal }),
  detail: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}`, clientUserDetailSchema, clientUserUnavailable, { signal }),
};
