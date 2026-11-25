import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { approvalRulesParams, approvalRulesQuery, ruleStatusFilter, type ApprovalRulesQuery } from "./admin-approval-rules";
import { adminPaginationSchema } from "./admin-pending";
import { poolEligibleList, poolOwnersList, poolUpdated, type PoolPolicyInput } from "./admin-pool-accounts";

const endpoint = "/api/admin/live-pool-accounts";
const account = z.object({ id: z.uuid(), name: z.string(), walletId: z.uuid(), verifiedAt: z.iso.datetime({ offset: true }) });
const confirmation = z.string().max(1024).regex(/^[\w-]+\.[\w-]+\.[\w-]+$/);
export const livePoolDraftSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).regex(/^[^\p{Cc}\p{Cf}]+$/u),
  walletId: z.uuid(),
  apiKey: z.string().trim().regex(/^\$aact_prod_[!-~]{10,500}$/),
});
export const livePoolConfirmationSchema = passkeyOptionsSchema.extend({ confirmation });
export const livePoolKeyDraft = livePoolDraftSchema.pick({ apiKey: true });
export const livePoolKeyProof = livePoolKeyDraft.extend({ confirmation, proof: integrationProofSchema });
export const liveWalletCloseDraft = z.strictObject({
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u),
});
export const liveWalletCloseProof = liveWalletCloseDraft.extend({ proof: integrationProofSchema });
export const liveWalletClosed = z.object({ closed: z.literal(true) });
export const livePoolRegisterSchema = livePoolDraftSchema.extend({ confirmation, proof: integrationProofSchema });
export const livePoolCreatedSchema = z.object({ account });
export const livePoolListSchema = z.object({ available: z.boolean(), canRotate: z.boolean().default(false),
  items: z.array(account.extend({ receives: z.boolean().default(false), withdraws: z.boolean().default(false) })).max(8),
  pagination: adminPaginationSchema,
});
const balanceInCents = z.string().regex(/^-?\d+$/);
export const liveWalletPositionsQuery = approvalRulesQuery;
export const liveWalletPositionsSchema = z.object({
  available: z.boolean().default(false),
  canRotate: z.boolean().default(false),
  pagination: adminPaginationSchema,
  items: z.array(account.extend({
    verifiedAt: account.shape.verifiedAt.optional(),
    closedAt: z.iso.datetime({ offset: true }).nullish(),
    receives: z.boolean().default(false), withdraws: z.boolean().default(false),
    withdrawalStatus: ruleStatusFilter.exclude(["ALL"]).optional(),
    bookedCents: balanceInCents, reservedCents: balanceInCents, providerCents: balanceInCents.nullable(),
    platformRevenueCents: balanceInCents.default("0"),
    differenceCents: balanceInCents.nullable(), checkedAt: z.iso.datetime({ offset: true }).nullable(),
  })).max(8),
});
export type LiveWalletPosition = z.infer<typeof liveWalletPositionsSchema>["items"][number];
export const livePoolUnavailable = "Cadastro de carteiras de produção indisponível.";
export type LivePoolDraft = z.infer<typeof livePoolDraftSchema>;

function post(body: object, timeoutMs?: number) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), timeoutMs };
}

export const livePoolAccounts = {
  options: (draft: LivePoolDraft) =>
    requestPixGateway(endpoint + "/options", livePoolConfirmationSchema, livePoolUnavailable, post(draft)),
  register: (draft: LivePoolDraft, confirmation: string, proof: IntegrationProof) =>
    requestPixGateway(endpoint, livePoolCreatedSchema, livePoolUnavailable, post({ ...draft, confirmation, proof }, 18_000)),
  rotationOptions: (id: string, apiKey: string) =>
    requestPixGateway(endpoint + `/${id}/key/options`, livePoolConfirmationSchema, livePoolUnavailable, post({ apiKey })),
  rotate: (id: string, apiKey: string, confirmation: string, proof: IntegrationProof) =>
    requestPixGateway(endpoint + `/${id}/key`, poolUpdated, livePoolUnavailable, post({ apiKey, confirmation, proof }, 18_000)),
};

export const walletControlsSchema = z.object({
  receives: z.boolean(), withdraws: z.boolean(), feeLimit: z.int().nonnegative().nullable(),
  eventsConfigured: z.boolean(), validationConfigured: z.boolean(),
  eventsPath: z.string().regex(/^\/webhooks\/asaas\/live\/[0-9a-f-]{36}$/),
  validationPath: z.string().regex(/^\/webhooks\/asaas\/live\/[0-9a-f-]{36}\/withdrawal-authorization$/),
});
const callbackToken = z.string().regex(/^(?!\$aact_)[!-~]{32,255}$/).optional();
export const liveWalletControlDraft = z.strictObject({
  poolId: z.uuidv4(), receives: z.boolean(), withdraws: z.boolean(), feeLimit: z.int().min(0).max(100000).optional(),
  eventsToken: callbackToken, validationToken: callbackToken,
});
export const liveWalletControlProof = liveWalletControlDraft.extend({ confirmation, proof: integrationProofSchema });
export const liveRoutingDraft = z.strictObject({
  merchantId: z.uuidv4(), mode: z.enum(["RANDOM", "FIXED", "RESTRICTED"]),
  poolIds: z.array(z.uuidv4()).max(100), version: z.int().min(0).max(2_000_000_000),
});
export const liveRoutingProof = liveRoutingDraft.extend({ confirmation, proof: integrationProofSchema });
export type LiveWalletControlDraft = z.infer<typeof liveWalletControlDraft>;

export const liveWalletPositions = {
  list: (query: ApprovalRulesQuery, signal: AbortSignal) =>
    requestPixGateway(endpoint + "/positions?" + approvalRulesParams(query),
      liveWalletPositionsSchema, "Não foi possível consultar as carteiras.", { signal }),
  refresh: (id: string) =>
    requestPixGateway(endpoint + "/positions/" + id + "/refresh", poolUpdated, "Não foi possível consultar o saldo do provedor.", post({})),
  closeOptions: (id: string, reason: string) =>
    requestPixGateway(endpoint + `/${id}/close/options`, passkeyOptionsSchema, "Não foi possível preparar o encerramento.", post({ reason })),
  close: (id: string, reason: string, proof: IntegrationProof) =>
    requestPixGateway(endpoint + `/${id}/close`, liveWalletClosed, "Não foi possível confirmar o encerramento.", post({ reason, proof }, 18_000)),
};

const liveOptions = (section: "controls" | "routing", draft: object) =>
  requestPixGateway(endpoint + "/" + section + "/options", livePoolConfirmationSchema, livePoolUnavailable, post(draft));

const liveApply = (section: "controls" | "routing", draft: object, confirmation: string, proof: IntegrationProof) =>
  requestPixGateway(endpoint + "/" + section, poolUpdated, livePoolUnavailable, post({ ...draft, confirmation, proof }));

function routingInput(merchantId: string, draft: PoolPolicyInput) {
  return { merchantId, mode: draft.mode, poolIds: draft.accountIds, version: draft.version };
}

export const livePoolControls = {
  wallet: (id: string, signal: AbortSignal) =>
    requestPixGateway(endpoint + "/controls/" + id, walletControlsSchema, livePoolUnavailable, { signal }),
  options: (draft: LiveWalletControlDraft) => liveOptions("controls", draft),
  apply: (draft: LiveWalletControlDraft, confirmation: string, proof: IntegrationProof) =>
    liveApply("controls", draft, confirmation, proof),
  owners: (page: number, search: string, signal: AbortSignal) =>
    requestPixGateway(endpoint + "/owners?" + new URLSearchParams({ page: String(page), search }), poolOwnersList, livePoolUnavailable, { signal }),
  eligible: (signal: AbortSignal) =>
    requestPixGateway(endpoint + "/eligible", poolEligibleList, livePoolUnavailable, { signal }),
  routingOptions: (id: string, draft: PoolPolicyInput) => liveOptions("routing", routingInput(id, draft)),
  routingApply: (id: string, draft: PoolPolicyInput, confirmation: string, proof: IntegrationProof) =>
    liveApply("routing", routingInput(id, draft), confirmation, proof),
};
