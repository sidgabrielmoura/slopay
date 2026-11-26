import "server-only";

import type { NextRequest } from "next/server";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import {
  companyPixPricingProof, defaultPixPricingDraft, defaultPixPricingProof, pixPricingSaved,
  pixPricingDirection, pixPricingTerms, pixPricingUnavailable, pixPricingView,
} from "@/features/admin/admin-pix-pricing";
import { forwardIntegrationRequest, integrationResponse } from "./integration-request";

export function forwardPixPricing(request: NextRequest, companyId?: string, options = false) {
  const base = companyId ? `/admin/companies/${companyId}/pix-pricing` as const : "/admin/preferences/pix-pricing";
  const directions = request.nextUrl.searchParams.getAll("direction");
  const direction = pixPricingDirection.safeParse(directions[0] ?? "CASH_IN");
  if (directions.length > 1 || !direction.success) return integrationResponse({ message: "Confira o tipo de tarifa." }, 400);
  const searchParams = new URLSearchParams({ direction: direction.data });
  if (request.method === "GET") {
    return forwardIntegrationRequest(request, {
      path: base, output: pixPricingView.refine(view => view.direction === direction.data), searchParams, unavailable: pixPricingUnavailable,
    });
  }
  const schema = options ? (companyId ? pixPricingTerms : defaultPixPricingDraft)
    : (companyId ? companyPixPricingProof : defaultPixPricingProof);
  const input = schema.transform(draft => direction.data === "CASH_OUT" ? { ...draft, direction: direction.data } : draft);
  return forwardIntegrationRequest(request, {
    path: options ? `${base}/options` : base, input, searchParams,
    output: options ? passkeyOptionsSchema : pixPricingSaved, unavailable: "Não foi possível confirmar a alteração da tarifa.",
  });
}
