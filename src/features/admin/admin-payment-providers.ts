import { z } from "zod";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { livePoolConfirmationSchema } from "./admin-live-pool-accounts";
import { paymentProviderCode } from "./admin-movement-filters";
import { adminPaginationSchema } from "./admin-pending";
import { poolPage } from "./admin-pool-accounts";

export const providerPageQuery = z.strictObject({ page: poolPage.default(1) });
export const providerDraftSchema = z.strictObject({
  code: paymentProviderCode.refine(code => code !== "ALL"),
  name: z.string().trim().min(1).max(100).regex(/^[^\p{Cc}\p{Cf}]+$/u),
});
export const providerRegistration = providerDraftSchema.extend({
  confirmation: livePoolConfirmationSchema.shape.confirmation,
  proof: integrationProofSchema,
});
export const providerRecord = providerDraftSchema.extend({ integrated: z.boolean() });
export const providerReport = z.object({ pagination: adminPaginationSchema, items: z.array(providerRecord).max(8) });
export const providerUnavailable = "Não foi possível consultar ou cadastrar o provedor.";
export type ProviderDraft = z.infer<typeof providerDraftSchema>;

const endpoint = "/api/admin/payment-providers";
const post = (body: object) => ({
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
export const adminPaymentProviders = {
  list: (page: number, signal: AbortSignal) => requestPixGateway(endpoint + "?page=" + page, providerReport, providerUnavailable, { signal }),
  options: (draft: ProviderDraft) => requestPixGateway(endpoint + "/options", livePoolConfirmationSchema, providerUnavailable, post(draft)),
  register: (draft: ProviderDraft, confirmation: string, proof: IntegrationProof) =>
    requestPixGateway(endpoint, providerRecord, providerUnavailable, post({ ...draft, confirmation, proof })),
};
