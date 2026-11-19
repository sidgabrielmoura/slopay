import type { NextRequest } from "next/server";
import { adminApprovalParams, adminApprovalQuery, adminApprovalsSchema, adminApprovalsUnavailable } from "@/features/admin/admin-withdrawal-approvals";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = adminApprovalQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }

  return forwardIntegrationRequest(request, {
    path: "/admin/withdrawal-approvals", output: adminApprovalsSchema,
    searchParams: adminApprovalParams(query.data), unavailable: adminApprovalsUnavailable,
  });
}
