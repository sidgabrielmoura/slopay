import type { NextRequest } from "next/server";
import { reportFile, reportHistory, reportHistoryQuery, reportIssue, reportsUnavailable } from "@/features/admin/admin-reports";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = reportHistoryQuery.safeParse(Object.fromEntries(params));
  if (!query.success || params.getAll("page").length > 1) {
    return integrationResponse({ message: "Confira a página solicitada." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/financial-reports", output: reportHistory,
    searchParams: new URLSearchParams({ page: String(query.data.page) }), unavailable: reportsUnavailable,
  });
}

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/financial-reports", input: reportIssue, output: reportFile,
    timeoutMs: 14_000, unavailable: "Não foi possível emitir o relatório.",
  });
}
