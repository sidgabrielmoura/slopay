import type { NextRequest } from "next/server";
import { adminWebhookHistorySchema, adminWebhookHistoryUnavailable, webhookHistoryQuery } from "@/features/admin/admin-webhooks";
import { webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = webhookIdSchema.safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Webhook não encontrado." }, 404);

  const filters = request.nextUrl.searchParams;
  const query = webhookHistoryQuery.safeParse(Object.fromEntries(filters));
  if (!query.success || Array.from(filters.keys()).some((key) => filters.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros das entregas." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/webhooks/${id.data}`, output: adminWebhookHistorySchema, unavailable: adminWebhookHistoryUnavailable,
    searchParams: new URLSearchParams({ state: query.data.state, page: String(query.data.page) }),
  });
}
