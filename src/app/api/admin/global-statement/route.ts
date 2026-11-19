import type { NextRequest } from "next/server";
import { globalStatementParams, globalStatementQuery, globalStatementReport, globalStatementUnavailable } from "@/features/admin/admin-global-statement";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = globalStatementQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros do extrato." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/global-statement", output: globalStatementReport, unavailable: globalStatementUnavailable,
    searchParams: globalStatementParams(query.data),
  });
}
