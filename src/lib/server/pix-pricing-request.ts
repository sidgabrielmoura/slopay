import "server-only";

import type { NextRequest } from "next/server";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import {
  companyPixPricingProof, defaultPixPricingDraft, defaultPixPricingProof, pixPricingSaved,
  pixPricingTerms, pixPricingUnavailable, pixPricingView,
} from "@/features/admin/admin-pix-pricing";
import { forwardIntegrationRequest } from "./integration-request";

export function forwardPixPricing(request: NextRequest, companyId?: string, options = false) {
  const base = companyId ? `/admin/companies/${companyId}/pix-pricing` as const : "/admin/preferences/pix-pricing";
  if (request.method === "GET") {
    return forwardIntegrationRequest(request, { path: base, output: pixPricingView, unavailable: pixPricingUnavailable });
  }
  const input = options ? (companyId ? pixPricingTerms : defaultPixPricingDraft)
    : (companyId ? companyPixPricingProof : defaultPixPricingProof);
  return forwardIntegrationRequest(request, {
    path: options ? `${base}/options` : base, input,
    output: options ? passkeyOptionsSchema : pixPricingSaved, unavailable: "Não foi possível confirmar a alteração da tarifa.",
  });
}
