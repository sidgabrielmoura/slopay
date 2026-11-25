import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminPaginationSchema } from "./admin-pending";

export const poolAccountsUnavailable = "Não foi possível consultar as contas bolsão.";
export const poolOwnersUnavailable = "Não foi possível consultar o roteamento dos titulares.";
export const poolOptionsUnavailable = "Não foi possível preparar a confirmação.";
export const poolWriteUnavailable = "Confira a configuração atual antes de tentar novamente.";
const api = "/api/admin/pool-accounts";
const id = z.uuid();
const version = z.int().min(0).max(2_000_000_000);
const name = z.string().trim().min(1).max(100).regex(/^[^\p{Cc}\p{Cf}]*$/u);
const apiKey = z.string().trim().regex(/^\$aact_hmlg_[!-~]{10,500}$/);
const webhookPath = z.string().regex(/^\/webhooks\/asaas\/pool-accounts\/[a-f0-9-]{36}$/);
export const poolPage = z.coerce.number().int().min(1).max(10_000);
export const poolOwnerSearch = z.string().trim().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u);
export const poolAccountsQuery = z.strictObject({ page: poolPage.default(1) });
export const poolOwnersQuery = poolAccountsQuery.extend({ search: poolOwnerSearch.default("") });

const poolAccountChoice = z.object({ id, name, walletId: id, active: z.boolean() });
const poolAccount = poolAccountChoice.extend({ verifiedAt: z.iso.datetime({ offset: true }), webhookPath });
const poolMode = z.enum(["RANDOM", "FIXED", "RESTRICTED"]);
const owner = z.object({
  id, name: z.string(), email: z.email(), mode: poolMode,
  accountIds: z.array(id).max(100), version,
});

const list = z.object({ available: z.boolean(), pagination: adminPaginationSchema });
export const poolAccountsList = list.extend({ items: z.array(poolAccount).max(8) });
export const poolOwnersList = list.extend({ items: z.array(owner).max(8) });
export const poolEligibleList = z.object({ items: z.array(poolAccountChoice).max(100) });

export const poolAccountInput = z.strictObject({
  name, walletId: id, customerId: z.string().trim().regex(/^cus_[A-Za-z0-9]{1,60}$/), apiKey,
});
export const poolCreateInput = poolAccountInput.extend({ proof: integrationProofSchema });
export const poolCreateResult = z.object({
  account: poolAccount,
  webhookToken: z.string().regex(/^[a-f0-9]{64}$/),
});
export const poolStatusInput = z.strictObject({ active: z.boolean() });
export const poolStatusProof = poolStatusInput.extend({ proof: integrationProofSchema });
const poolPolicy = z.strictObject({ mode: poolMode, accountIds: z.array(id).max(100), version });
function validPoolPolicy({ mode, accountIds }: z.infer<typeof poolPolicy>) {
  if (mode === "RANDOM") return accountIds.length === 0;
  if (mode === "FIXED") return accountIds.length === 1;
  return accountIds.length >= 2 && new Set(accountIds.map((id) => id.toLowerCase())).size === accountIds.length;
}
export const poolPolicyInput = poolPolicy.refine(validPoolPolicy);
export const poolPolicyProof = poolPolicy.extend({ proof: integrationProofSchema }).refine(validPoolPolicy);
export const poolUpdated = z.object({ updated: z.literal(true) });

export type PoolAccount = z.infer<typeof poolAccount>;
export type PoolAccountChoice = z.infer<typeof poolAccountChoice>;
export type PoolOwner = z.infer<typeof owner>;
export type PoolMode = z.infer<typeof poolMode>;
export type PoolAccountInput = z.infer<typeof poolAccountInput>;
export type PoolCreateResult = z.infer<typeof poolCreateResult>;
export type PoolPolicyInput = z.infer<typeof poolPolicyInput>;

export const poolModeLabels: Record<PoolMode, string> = {
  RANDOM: "Sorteio padrão",
  FIXED: "Conta fixa",
  RESTRICTED: "Sorteio restrito",
};

function post(body: object, timeoutMs?: number) {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), timeoutMs };
}

export const poolAccounts = {
  list: (page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}?page=${page}`, poolAccountsList, poolAccountsUnavailable, { signal }),
  owners: (page: number, search: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/owners?${new URLSearchParams({ search, page: String(page) })}`, poolOwnersList, poolOwnersUnavailable, { signal }),
  eligible: (signal: AbortSignal) =>
    requestPixGateway(`${api}/eligible`, poolEligibleList, poolAccountsUnavailable, { signal }),
  registrationOptions: (data: PoolAccountInput) =>
    requestPixGateway(`${api}/options`, passkeyOptionsSchema, poolOptionsUnavailable, post(data)),
  register: (data: PoolAccountInput, proof: IntegrationProof) =>
    requestPixGateway(api, poolCreateResult, poolWriteUnavailable, post({ ...data, proof }, 25_000)),
  statusOptions: (id: string, active: boolean) =>
    requestPixGateway(`${api}/${id}/status/options`, passkeyOptionsSchema, poolOptionsUnavailable, post({ active })),
  setStatus: (id: string, active: boolean, proof: IntegrationProof) =>
    requestPixGateway(`${api}/${id}/status`, poolUpdated, poolWriteUnavailable, post({ active, proof })),
  policyOptions: (ownerId: string, data: PoolPolicyInput) =>
    requestPixGateway(`${api}/owners/${ownerId}/options`, passkeyOptionsSchema, poolOptionsUnavailable, post(data)),
  setPolicy: (ownerId: string, data: PoolPolicyInput, proof: IntegrationProof) =>
    requestPixGateway(`${api}/owners/${ownerId}`, poolUpdated, poolWriteUnavailable, post({ ...data, proof })),
};
