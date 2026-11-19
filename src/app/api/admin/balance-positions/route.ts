import type { NextRequest } from "next/server";
import { balancePositionsParams, balancePositionsQuery, balancePositionsReport, balancePositionsUnavailable } from "@/features/admin/admin-balance-positions";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = balancePositionsQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/operational-accounts/positions", output: balancePositionsReport, unavailable: balancePositionsUnavailable,
    searchParams: balancePositionsParams(query.data),
  });
}
