import type { NextRequest } from "next/server";
import { adminTeamParams, adminTeamQuery, adminTeamSchema, adminTeamUnavailable } from "@/features/admin/admin-team";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = adminTeamQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da equipe." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/team", output: adminTeamSchema, unavailable: adminTeamUnavailable, searchParams: adminTeamParams(query.data),
  });
}
