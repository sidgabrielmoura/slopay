import type { NextRequest } from "next/server";
import { reportPreviewQuery, reportPreview, reportPreviewParams, reportsUnavailable } from "@/features/admin/admin-reports";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = reportPreviewQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros do relatório." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/financial-reports/preview", output: reportPreview, searchParams: reportPreviewParams(query.data),
    unavailable: reportsUnavailable,
  });
}
