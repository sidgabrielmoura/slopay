import type { NextRequest } from "next/server";
import { accountOpeningsSchema, openingQuery, openingsUnavailable } from "@/features/admin/account-openings";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = openingQuery.strict().safeParse(Object.fromEntries(searchParams));
  if (!query.success || Array.from(searchParams.keys()).some((key) => searchParams.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/account-openings", output: accountOpeningsSchema, unavailable: openingsUnavailable,
    searchParams: new URLSearchParams({ ...query.data, page: String(query.data.page) }),
  });
}
