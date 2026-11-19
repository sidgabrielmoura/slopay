import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { companyOperationsSchema } from "./admin-companies";
import { adminPaginationSchema } from "./admin-pending";

export const operationalAccountsPath = "/admin/contas";
export const operationalAccountsUnavailable = "Não foi possível consultar as contas operacionais.";
const api = "/api/admin/operational-accounts";
const status = z.enum(["ACTIVE", "PAUSED", "RESTRICTED"]);
const date = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
export const operationalStatusFilter = z.enum(["ALL", ...status.options]);
export const operationalSearch = z.string().trim().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u);
export const operationalPage = z.coerce.number().int().min(1).max(10_000);
export const operationalQuerySchema = z.strictObject({
  status: operationalStatusFilter.default("ALL"),
  search: operationalSearch.default(""),
  page: operationalPage.default(1),
});
export const operationalAccountItemSchema = z.object({
  id: z.uuid(), companyId: z.uuid(), companyName: z.string(), cnpj: z.string().nullable(), status,
  walletSuffix: z.string().max(8), linkedAt: date, balanceInCents: z.int().nullable(), balanceCheckedAt: date.nullable(),
});
export const operationalAccountsSchema = z.object({
  summary: z.object({ total: count, active: count, paused: count, restricted: count }),
  pagination: adminPaginationSchema,
  items: z.array(operationalAccountItemSchema).max(8),
});
const version = z.int().min(0).max(2_000_000_000);
export const operationalAccountDetailSchema = operationalAccountItemSchema.extend({
  verifiedAt: date, version, pausedAt: date.nullable(), pixKeysCheckedAt: date.nullable(),
  canManage: z.boolean(), withdrawalsEnabled: z.boolean(), minimumChargeInCents: z.int().positive(),
  openWithdrawals: z.object({ count, amountInCents: z.int().nonnegative() }),
});
export const operationalAccountKeysSchema = z.object({
  checkedAt: date.nullable(), pagination: adminPaginationSchema,
  items: z.array(z.object({
    id: z.string().regex(/^[a-f0-9]{64}$/), type: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"]),
    status: z.enum(["ACTIVE", "AWAITING_ACTIVATION", "AWAITING_DELETION", "AWAITING_ACCOUNT_DELETION", "ERROR"]),
    maskedKey: z.string().max(32).nullable(),
  })).max(8),
});
export const operationalAccountAuditSchema = z.object({
  pagination: adminPaginationSchema,
  items: z.array(z.object({
    id: z.string(), paused: z.boolean(), actor: z.string().nullable(), reason: z.string(), createdAt: date,
  })).max(8),
});
export const operationalChangeSchema = z.strictObject({
  paused: z.boolean(), version,
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u),
});
export const operationalProofSchema = operationalChangeSchema.extend({ proof: integrationProofSchema });
export const operationalUpdatedSchema = z.object({ updated: z.literal(true) });
export const operationalRefreshSchema = z.object({ balanceUpdated: z.boolean(), keysUpdated: z.boolean() });

export type OperationalListItem = z.infer<typeof operationalAccountItemSchema>;
export type OperationalAccountDetail = z.infer<typeof operationalAccountDetailSchema>;
export type OperationalQuery = z.infer<typeof operationalQuerySchema>;
export type OperationalStatus = z.infer<typeof status>;
export type OperationalChange = z.infer<typeof operationalChangeSchema>;
export type OperationalKey = z.infer<typeof operationalAccountKeysSchema>["items"][number];

export const operationalStatusLabels: Record<OperationalStatus, string> = {
  ACTIVE: "Liberadas", PAUSED: "Pausadas", RESTRICTED: "Acesso restrito",
};

export function operationalQueryFrom(params: Pick<URLSearchParams, "get">): OperationalQuery {
  return {
    search: operationalSearch.catch("").parse(params.get("search")),
    status: operationalStatusFilter.catch("ALL").parse(params.get("status")),
    page: operationalPage.catch(1).parse(params.get("page")),
  };
}

export function operationalParams(query: OperationalQuery) {
  const params = new URLSearchParams();
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  return params.size ? "?" + params : "";
}

function post(body: object, timeoutMs?: number) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), timeoutMs };
}

export const adminOperationalAccounts = {
  list: (query: OperationalQuery, signal: AbortSignal) =>
    requestPixGateway(api + operationalParams(query), operationalAccountsSchema, operationalAccountsUnavailable, { signal }),
  detail: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}`, operationalAccountDetailSchema, operationalAccountsUnavailable, { signal }),
  operations: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}/operations?page=${page}`, companyOperationsSchema, "Movimentações indisponíveis.", { signal }),
  keys: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}/keys?page=${page}`, operationalAccountKeysSchema, "Chaves Pix indisponíveis.", { signal }),
  audit: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}/audit?page=${page}`, operationalAccountAuditSchema, "Auditoria indisponível.", { signal }),
  options: (id: string, change: OperationalChange) =>
    requestPixGateway(`${api}/${id}/status/options`, passkeyOptionsSchema, "Não foi possível preparar a confirmação.", post(change)),
  change: (id: string, change: OperationalChange, proof: IntegrationProof) =>
    requestPixGateway(`${api}/${id}/status`, operationalUpdatedSchema, "Não foi possível alterar as operações da conta.", post({ ...change, proof })),
  refresh: (id: string) =>
    requestPixGateway(`${api}/${id}/refresh`, operationalRefreshSchema, "Não foi possível atualizar o saldo e as chaves Pix.", post({}, 16_000)),
};
