import type { NextRequest } from "next/server";
import { medFilterOptions, medOptionsQuery } from "@/features/admin/admin-pix-med";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = medOptionsQuery.safeParse(Object.fromEntries(params));
  if (!query.success || [...params.keys()].some(key => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query.data)) if (value) searchParams.set(key, value);
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-med/filter-options", output: medFilterOptions, unavailable: "Os filtros estão indisponíveis.", searchParams,
  });
}
