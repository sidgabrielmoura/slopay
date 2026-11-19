import type { NextRequest } from "next/server";
import { adminWebhookParams, adminWebhookQuery, adminWebhooksSchema, adminWebhooksUnavailable } from "@/features/admin/admin-webhooks";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = adminWebhookQuery.safeParse(Object.fromEntries(params));
  if (!query.success || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros dos webhooks." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/webhooks", output: adminWebhooksSchema, unavailable: adminWebhooksUnavailable,
    searchParams: adminWebhookParams(query.data),
  });
}
