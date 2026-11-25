import type { NextRequest } from "next/server";
import { providerPageQuery, providerRecord, providerRegistration, providerReport, providerUnavailable } from "@/features/admin/admin-payment-providers";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = providerPageQuery.safeParse(Object.fromEntries(params));
  if (!query.success || params.getAll("page").length > 1) return integrationResponse({ message: "Confira a página informada." }, 400);
  return forwardIntegrationRequest(request, {
    path: "/admin/payment-providers", output: providerReport, unavailable: providerUnavailable,
    searchParams: new URLSearchParams({ page: String(query.data.page) }),
  });
}

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/payment-providers", input: providerRegistration, output: providerRecord, unavailable: providerUnavailable,
  });
}
