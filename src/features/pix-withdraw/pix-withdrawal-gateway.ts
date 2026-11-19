import { ApiError } from "@/lib/api-client";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { recentWithdrawalsSchema, withdrawalOptionsSchema, withdrawalSchema, withdrawalUnavailable, type WithdrawalDraftInput, type WithdrawalInput } from "./pix-withdrawal";

const endpoint = "/api/payments/pix-withdrawals";

export const withdrawalOptionsKey = (accountId: string) => ["pix-withdrawal-options", accountId] as const;
export const recentWithdrawalsKey = (accountId: string) => ["pix-withdrawals", accountId] as const;

export const asaasPixWithdrawals = {
  options: (signal?: AbortSignal) => requestPixGateway(endpoint + "/options", withdrawalOptionsSchema, withdrawalUnavailable, { signal }),
  recent: (signal?: AbortSignal) => requestPixGateway(endpoint, recentWithdrawalsSchema, withdrawalUnavailable, { signal }),
  passkeyOptions: (id: string, input: WithdrawalDraftInput) => requestPixGateway(
    endpoint + "/passkey-options", passkeyOptionsSchema, withdrawalUnavailable, {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": id }, body: JSON.stringify(input),
    },
  ),
  async create(id: string, input: WithdrawalInput) {
    const result = await requestPixGateway(endpoint, withdrawalSchema, withdrawalUnavailable, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": id },
      body: JSON.stringify(input),
    });
    if (result.id !== id || result.amountInCents !== input.amountInCents || result.simulated !== input.simulate) {
      throw new ApiError(withdrawalUnavailable, 503);
    }
    return result;
  },
  async get(id: string, signal?: AbortSignal) {
    const result = await requestPixGateway(endpoint + "/" + encodeURIComponent(id), withdrawalSchema, withdrawalUnavailable, { signal });
    if (result.id !== id) throw new ApiError(withdrawalUnavailable, 503);
    return result;
  },
};
