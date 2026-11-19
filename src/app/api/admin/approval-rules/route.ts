import type { NextRequest } from "next/server";
import {
  adminApprovalRulesSchema, adminApprovalRulesUnavailable, approvalRulesParams, approvalRulesQuery,
} from "@/features/admin/admin-approval-rules";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = approvalRulesQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros das regras de alçada." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/approval-rules",
    output: adminApprovalRulesSchema,
    searchParams: approvalRulesParams(query.data),
    unavailable: adminApprovalRulesUnavailable,
  });
}
