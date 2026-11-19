import type { NextRequest } from "next/server";
import { adminBatchParams, adminBatchQuery, adminBatchesSchema, adminBatchesUnavailable } from "@/features/admin/admin-withdrawal-batches";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = adminBatchQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-withdrawal-batches", output: adminBatchesSchema, unavailable: adminBatchesUnavailable,
    searchParams: adminBatchParams(query.data),
  });
}
