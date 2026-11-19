import type { NextRequest } from "next/server";
import { pixQueryString, pixTransactionQuery, pixTransactionsReport, pixTransactionsUnavailable } from "@/features/admin/admin-pix-transactions";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = pixTransactionQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros da consulta." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-transactions", output: pixTransactionsReport, unavailable: pixTransactionsUnavailable,
    searchParams: new URLSearchParams(pixQueryString(query.data)),
  });
}
