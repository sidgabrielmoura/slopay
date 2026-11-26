import type { NextRequest } from "next/server";
import { medMutation, medQuery, medQueryParams, medRegister, medReport, medUnavailable } from "@/features/admin/admin-pix-med";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = medQuery.safeParse(Object.fromEntries(params));
  if (!query.success || [...params.keys()].some(key => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-med", output: medReport, unavailable: medUnavailable, searchParams: medQueryParams(query.data),
  });
}

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-med", input: medRegister, output: medMutation, unavailable: "Não foi possível registrar a contestação.",
  });
}
