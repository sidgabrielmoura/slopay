import { ApiError } from "@/lib/api-client";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { batchDetailSchema, batchListSchema, batchesUnavailable, type BatchDraftInput, type BatchInput } from "./live-batches";

const endpoint = "/api/payments/pix-withdrawals/batches";

export const batchKeys = {
  list: (accountId: string) => ["withdrawal-batches", accountId] as const,
  detail: (accountId: string, id: string) => ["withdrawal-batch", accountId, id] as const,
};

export const liveBatchesGateway = {
  list: (page: number, signal: AbortSignal) => requestPixGateway(endpoint + "?" + new URLSearchParams({ page: String(page) }),
    batchListSchema, batchesUnavailable, { signal }),
  passkeyOptions: (id: string, input: BatchDraftInput) => requestPixGateway(
    endpoint + "/passkey-options", passkeyOptionsSchema, batchesUnavailable, {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": id }, body: JSON.stringify(input),
    },
  ),
  async get(id: string, signal?: AbortSignal) {
    const result = await requestPixGateway(endpoint + "/" + encodeURIComponent(id), batchDetailSchema, batchesUnavailable, { signal });
    if (result.id !== id) throw new ApiError(batchesUnavailable, 503);
    return result;
  },
  async create(id: string, input: BatchInput) {
    const result = await requestPixGateway(endpoint, batchDetailSchema, batchesUnavailable, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": id },
      body: JSON.stringify(input),
    });
    const total = input.transfers.reduce((sum, item) => sum + item.amountInCents, 0);
    if (result.id !== id || result.amountInCents !== total ||
      result.count !== input.transfers.length || result.simulated !== input.simulate) throw new ApiError(batchesUnavailable, 503);
    return result;
  },
};
