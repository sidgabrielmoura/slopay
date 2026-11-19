import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminActivitySchema, adminActivityUnavailable } from "@/features/admin/admin-activity";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const page = z.coerce.number().int().min(1).max(10000).safeParse(query.get("page") ?? 1);
  if (!page.success || Array.from(query.keys()).some((key) => key !== "page" || query.getAll(key).length > 1)) {
    return integrationResponse({ message: "Selecione uma página válida." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/notifications", output: adminActivitySchema, unavailable: adminActivityUnavailable,
    searchParams: new URLSearchParams({ page: String(page.data) }),
  });
}
