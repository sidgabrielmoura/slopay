import type { NextRequest } from "next/server";
import {
  livePoolCreatedSchema, livePoolListSchema, livePoolRegisterSchema, livePoolUnavailable,
} from "@/features/admin/admin-live-pool-accounts";
import { poolAccountsQuery } from "@/features/admin/admin-pool-accounts";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = poolAccountsQuery.safeParse(Object.fromEntries(params));
  if (!query.success || params.getAll("page").length > 1) return integrationResponse({ message: "Confira a página informada." }, 400);
  return forwardIntegrationRequest(request, {
    path: "/admin/live-pool-accounts", output: livePoolListSchema, unavailable: livePoolUnavailable,
    searchParams: new URLSearchParams({ page: String(query.data.page) }),
  });
}

export function POST(request: NextRequest) {
  return forwardIntegrationRequest(request, {
    path: "/admin/live-pool-accounts", input: livePoolRegisterSchema, output: livePoolCreatedSchema,
    unavailable: livePoolUnavailable, timeoutMs: 15_000,
  });
}
