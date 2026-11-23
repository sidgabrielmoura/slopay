import type { NextRequest } from "next/server";
import { livePoolConfirmationSchema, livePoolDraftSchema, livePoolUnavailable } from "@/features/admin/admin-live-pool-accounts";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/live-pool-accounts/options", input: livePoolDraftSchema,
    output: livePoolConfirmationSchema, unavailable: livePoolUnavailable,
  });
}
