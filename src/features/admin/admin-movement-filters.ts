import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";

export const paymentProviderCode = z.string().regex(/^[A-Z][A-Z0-9_]{1,31}$/);
export const movementMerchantId = z.uuid().transform(value => value.toLowerCase());
export const movementScope = {
  merchantId: movementMerchantId.optional(),
  provider: paymentProviderCode.optional(),
};

export const movementFilterOptionsQuery = z.strictObject({
  search: z.string().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u).trim().default(""),
  merchantId: movementScope.merchantId,
});
export const movementFilterOptions = z.object({
  clients: z.array(z.object({ value: movementMerchantId, label: z.string() })).max(16),
  providers: z.array(z.object({ value: paymentProviderCode, label: z.string() })),
});
export const movementOptionsUnavailable = "Não foi possível consultar os clientes e provedores.";

export function movementScopeFrom(params: Pick<URLSearchParams, "get">) {
  return {
    merchantId: movementMerchantId.safeParse(params.get("merchantId")).data,
    provider: paymentProviderCode.safeParse(params.get("provider")).data,
  };
}

export function setMovementScope(params: URLSearchParams, query: z.infer<z.ZodObject<typeof movementScope>>) {
  if (query.merchantId) params.set("merchantId", query.merchantId);
  if (query.provider) params.set("provider", query.provider);
}

export function fetchMovementFilterOptions(search: string, merchantId: string | undefined, signal: AbortSignal) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (merchantId) params.set("merchantId", merchantId);
  return requestPixGateway("/api/admin/pix-transactions/filter-options?" + params, movementFilterOptions,
    movementOptionsUnavailable, { signal });
}
