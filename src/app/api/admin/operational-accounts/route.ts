import type { NextRequest } from "next/server";
import { operationalAccountsSchema, operationalAccountsUnavailable, operationalQuerySchema } from "@/features/admin/admin-operational-accounts";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = operationalQuerySchema.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/operational-accounts", output: operationalAccountsSchema, unavailable: operationalAccountsUnavailable,
    searchParams: new URLSearchParams({ ...query.data, page: String(query.data.page) }),
  });
}
