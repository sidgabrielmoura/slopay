import type { NextRequest } from "next/server";
import { adminWebhookDeliverySchema, adminWebhookDeliveryUnavailable, webhookAttemptQuery } from "@/features/admin/admin-webhooks";
import { webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

type Context = { params: Promise<{ id: string; deliveryId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id, deliveryId } = await params;
  if (!webhookIdSchema.safeParse(id).success || !webhookIdSchema.safeParse(deliveryId).success) {
    return integrationResponse({ message: "Entrega de webhook não encontrada." }, 404);
  }

  const filters = request.nextUrl.searchParams;
  const query = webhookAttemptQuery.safeParse(Object.fromEntries(filters));
  if (!query.success || filters.getAll("page").length > 1) {
    return integrationResponse({ message: "Confira a página das tentativas." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/webhooks/${id}/deliveries/${deliveryId}`, output: adminWebhookDeliverySchema, unavailable: adminWebhookDeliveryUnavailable,
    searchParams: new URLSearchParams({ page: String(query.data.page) }),
  });
}
