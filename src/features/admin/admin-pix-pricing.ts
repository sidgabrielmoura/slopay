import { z } from "zod";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { integrationProofSchema, type IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";

export const maxFixedPixFee = 2_000_000_000;
export const maxMonthlyPix = 1_000_000;
const minimumFee = z.int().min(0).max(maxFixedPixFee);
export const pixPricingTerms = z.strictObject({
  fixedCents: z.int().min(0).max(maxFixedPixFee),
  minimumCents: minimumFee.optional(),
  percentageUnits: z.int().min(0).max(1_000_000),
  monthlyFreePix: z.int().min(0).max(maxMonthlyPix),
  version: z.int().min(0).max(2_000_000_000),
});
export const defaultPixPricingDraft = pixPricingTerms.extend({ revenueWalletId: z.uuid().nullable().optional() });
export const companyPixPricingProof = pixPricingTerms.extend({ proof: integrationProofSchema });
export const defaultPixPricingProof = defaultPixPricingDraft.extend({ proof: integrationProofSchema });
export const pixPricingView = pixPricingTerms.strip().extend({
  minimumCents: minimumFee.default(0),
  environment: z.enum(["LIVE", "SANDBOX"]),
  source: z.enum(["NONE", "DEFAULT", "CUSTOM"]),
  updatedAt: z.iso.datetime().nullable(),
});
export const pixPricingSaved = z.object({ saved: z.literal(true) });
export type PixPricingView = z.infer<typeof pixPricingView>;
export type PixPricingDraft = z.infer<typeof pixPricingTerms>;

export const pixPricingUnavailable = "Não foi possível consultar a tarifa do Slopay.";
const pricingPath = (companyId?: string) => companyId
  ? `/api/admin/companies/${companyId}/pix-pricing` : "/api/admin/preferences/pix-pricing";
const post = (body: object) => ({
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export const adminPixPricing = {
  read: (companyId: string | undefined, signal: AbortSignal) => requestPixGateway(
    pricingPath(companyId), pixPricingView, pixPricingUnavailable, { signal },
  ),
  options: (companyId: string | undefined, draft: PixPricingDraft) => requestPixGateway(
    pricingPath(companyId) + "/options", passkeyOptionsSchema, "Não foi possível preparar a confirmação.", post(draft),
  ),
  save: (companyId: string | undefined, draft: PixPricingDraft, proof: IntegrationProof) => requestPixGateway(
    pricingPath(companyId), pixPricingSaved, "Não foi possível confirmar a alteração da tarifa.", post({ ...draft, proof }),
  ),
};
