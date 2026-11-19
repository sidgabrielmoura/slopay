import type { NextRequest } from "next/server";
import { adminPixFeesList, adminPixFeesQuery, adminPixFeesUnavailable } from "@/features/admin/admin-pix-fees";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = adminPixFeesQuery.safeParse(Object.fromEntries(params));
  if (!parsed.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros das tarifas." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pix-fees", output: adminPixFeesList, unavailable: adminPixFeesUnavailable,
    searchParams: new URLSearchParams({ ...parsed.data, page: String(parsed.data.page) }),
  });
}
