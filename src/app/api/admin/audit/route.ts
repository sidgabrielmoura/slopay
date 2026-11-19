import type { NextRequest } from "next/server";
import { adminAuditParams, adminAuditQuery, adminAuditSchema, adminAuditUnavailable } from "@/features/admin/admin-audit";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = adminAuditQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da trilha de auditoria." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/audit", output: adminAuditSchema, unavailable: adminAuditUnavailable, searchParams: adminAuditParams(query.data),
  });
}
