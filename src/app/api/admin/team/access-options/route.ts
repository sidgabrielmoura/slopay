import type { NextRequest } from "next/server";
import { adminAccessOptionsSchema } from "@/features/admin/admin-access";
import { forwardIntegrationRequest } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/team/access-options", output: adminAccessOptionsSchema,
    unavailable: "Não foi possível consultar os níveis de acesso.",
  });
}
