import type { NextRequest } from "next/server";
import { companiesQuerySchema, companiesSchema, companiesUnavailable } from "@/features/admin/admin-companies";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = companiesQuerySchema.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/companies", output: companiesSchema, unavailable: companiesUnavailable,
    searchParams: new URLSearchParams({ ...query.data, page: String(query.data.page) }),
  });
}
