import type { NextRequest } from "next/server";
import { movementFilterOptions, movementFilterOptionsQuery, movementOptionsUnavailable } from "@/features/admin/admin-movement-filters";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = movementFilterOptionsQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some(key => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-transactions/filter-options", output: movementFilterOptions, unavailable: movementOptionsUnavailable,
    searchParams: params,
  });
}
