import { z } from "zod";
import { openingDraftSchema } from "@/features/account-validation/account-opening-application";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminPaginationSchema } from "./admin-pending";

export const openingsPath = "/admin/abertura-de-contas";
const endpoint = "/api/admin/account-openings";
export const openingsUnavailable = "Não foi possível consultar a abertura de contas.";
export const openingStatus = z.enum([
  "AWAITING_EMAIL", "AWAITING_MFA", "AWAITING_APPLICATION", "READY", "UNDER_REVIEW", "CHANGES_REQUESTED",
  "RESUBMITTED", "APPROVED", "LINKED", "REJECTED", "RESTRICTED", "PILOT",
]);
export const openingFilter = z.enum(["ALL", ...openingStatus.options]);
export const openingSearch = z.string().trim().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u);
export const openingPage = z.coerce.number().int().min(1).max(10_000);
export const openingQuery = z.object({
  status: openingFilter.default("ALL"),
  search: openingSearch.default(""),
  page: openingPage.default(1),
});
export type OpeningQuery = z.infer<typeof openingQuery>;
export type OpeningStatus = z.infer<typeof openingStatus>;

export const openingStatusLabels: Record<OpeningStatus, string> = {
  AWAITING_EMAIL: "E-mail pendente",
  AWAITING_MFA: "Autenticador pendente",
  AWAITING_APPLICATION: "Aguardando envio",
  READY: "Pronto para análise",
  UNDER_REVIEW: "Em análise",
  CHANGES_REQUESTED: "Ajustes solicitados",
  RESUBMITTED: "Reenviado",
  APPROVED: "Aprovado",
  LINKED: "Vinculado",
  REJECTED: "Recusado",
  RESTRICTED: "Acesso restrito",
  PILOT: "Conta piloto",
};

const instant = z.iso.datetime({ offset: true });
const nullableText = z.string().nullable();
const application = z.object({
  id: z.uuid(), ownerName: z.string(), ownerEmail: z.string(),
  legalName: nullableText, cnpj: nullableText, analystName: nullableText,
  accountType: z.enum(["PF", "PJ"]).nullish(),
  createdAt: instant, status: openingStatus,
});
export const accountOpeningsSchema = z.object({
  summary: z.object({ total: z.int().nonnegative(), waitingForOwner: z.int().nonnegative(), actionable: z.int().nonnegative(), approved: z.int().nonnegative() }),
  pagination: adminPaginationSchema,
  items: z.array(application).max(8),
});
const reviewAction = z.enum(["START_REVIEW", "REQUEST_CHANGES", "REJECT", "REOPEN"]);
const historyAction = z.enum(["REGISTERED", "EMAIL_VERIFIED", "MFA_ENABLED", "SUBMIT", "RESUBMIT", "APPROVE", "LINKED", ...reviewAction.options]);
export const openingHistoryLabels: Record<z.infer<typeof historyAction>, string> = {
  REGISTERED: "Titular cadastrado",
  EMAIL_VERIFIED: "E-mail confirmado",
  MFA_ENABLED: "Autenticador cadastrado",
  SUBMIT: "Solicitação enviada",
  START_REVIEW: "Análise atribuída",
  REQUEST_CHANGES: "Ajustes solicitados",
  RESUBMIT: "Cadastro reenviado",
  REJECT: "Cadastro recusado",
  REOPEN: "Análise reaberta",
  APPROVE: "Cadastro aprovado",
  LINKED: "Conta Sandbox vinculada",
};
const webhookPath = z.string().regex(/^\/webhooks\/asaas\/accounts\/[0-9a-f-]{36}$/);
const version = z.int().min(0).max(2_000_000_000);
export const accountOpeningDetailSchema = z.object({
  application: application.extend({
    ownerPhone: z.string(), cpfSuffix: z.string().max(2), ownerStatus: z.enum(["ACTIVE", "PENDING_VERIFICATION", "LOCKED", "SUSPENDED"]),
    emailVerified: z.boolean(), emailVerifiedAt: instant.nullable(), mfaEnabled: z.boolean(),
    analystId: z.uuid().nullable(), version, reason: nullableText,
    reviewedAt: instant.nullable(), linkedAt: instant.nullable(), webhookPath: webhookPath.nullable(),
    submittedAt: instant.nullish(), submittedData: openingDraftSchema.nullish(),
    sandboxEnabled: z.boolean(),
  }),
  history: z.object({
    pagination: adminPaginationSchema,
    items: z.array(z.object({ id: z.string(), action: historyAction, actorName: nullableText, reason: nullableText, createdAt: instant })).max(8),
  }),
});

export const openingReviewSchema = z.strictObject({
  version, action: reviewAction,
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u).optional(),
});
export const openingApprovalOptionsSchema = z.strictObject({ version });
export const openingApprovalSchema = openingApprovalOptionsSchema.extend({ proof: integrationProofSchema });
export const openingUpdatedSchema = z.object({ updated: z.literal(true) });
export type OpeningReview = z.infer<typeof openingReviewSchema>;
export type OpeningItem = z.infer<typeof application>;
export type OpeningDetail = z.infer<typeof accountOpeningDetailSchema>;

export function openingParams(query: OpeningQuery) {
  const params = new URLSearchParams();
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? "?" + search : "";
}

export function openingQueryFrom(params: Pick<URLSearchParams, "get">): OpeningQuery {
  return {
    status: openingFilter.catch("ALL").parse(params.get("status")),
    search: openingSearch.catch("").parse(params.get("search")),
    page: openingPage.catch(1).parse(params.get("page")),
  };
}

function post(body: object, timeoutMs?: number) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), timeoutMs };
}

export const accountOpenings = {
  list: (query: OpeningQuery, signal: AbortSignal) =>
    requestPixGateway(endpoint + openingParams(query), accountOpeningsSchema, openingsUnavailable, { signal }),
  detail: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(endpoint + "/" + id + "?page=" + page, accountOpeningDetailSchema, openingsUnavailable, { signal }),
  review: (id: string, input: OpeningReview) =>
    requestPixGateway(endpoint + "/" + id + "/review", openingUpdatedSchema, "Não foi possível registrar a decisão.", post(input)),
  approvalOptions: (id: string, version: number) =>
    requestPixGateway(endpoint + "/" + id + "/approve/options", passkeyOptionsSchema, "Não foi possível preparar a confirmação.", post({ version })),
  approve: (id: string, version: number, proof: IntegrationProof) =>
    requestPixGateway(endpoint + "/" + id + "/approve", openingUpdatedSchema, "Consulte a situação do cadastro antes de tentar aprovar novamente.", post({ version, proof })),
};
