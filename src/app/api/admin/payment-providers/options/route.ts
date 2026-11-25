import type { NextRequest } from "next/server";
import { livePoolConfirmationSchema } from "@/features/admin/admin-live-pool-accounts";
import { providerDraftSchema, providerUnavailable } from "@/features/admin/admin-payment-providers";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/payment-providers/options", input: providerDraftSchema, output: livePoolConfirmationSchema, unavailable: providerUnavailable,
  });
}
