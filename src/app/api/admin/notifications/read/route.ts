import type { NextRequest } from "next/server";
import { markAdminNoticesResultSchema, markAdminNoticesSchema } from "@/features/admin/admin-activity";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/notifications/read", input: markAdminNoticesSchema, output: markAdminNoticesResultSchema,
    unavailable: "Não foi possível marcar as notificações como lidas.",
  });
}
