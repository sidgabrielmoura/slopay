import type { NextRequest } from "next/server";
import { adminChargeParams, adminChargeQuery, adminChargesUnavailable, adminPixChargesSchema } from "@/features/admin/admin-pix-charges";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = adminChargeQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-charges", output: adminPixChargesSchema, unavailable: adminChargesUnavailable,
    searchParams: new URLSearchParams(adminChargeParams(query.data)),
  });
}
