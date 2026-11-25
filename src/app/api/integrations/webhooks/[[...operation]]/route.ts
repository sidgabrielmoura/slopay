import type { NextRequest } from "next/server";
import { developmentFeaturesEnabled } from "@/config/development";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import {
  confirmedWebhookActionSchema, sandboxWebhookListSchema, sandboxWebhookSchema, webhookActionSchema,
  webhookActionResultSchema, webhookDeliveryDetailSchema, webhookDeliveryPageSchema, webhookIdSchema,
  webhookLogFilterSchema, webhookVerificationSchema,
} from "@/features/webhooks/sandbox-webhooks";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

const base = () => `/integrations/${developmentFeaturesEnabled() ? "sandbox" : "live"}/webhooks` as const;
const unavailable = "Os webhooks estão temporariamente indisponíveis.";
type Context = { params: Promise<{ operation?: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  const path = base();
  const parts = (await params).operation ?? [];
  if (!parts.length) return forwardIntegrationRequest(request, { path, output: sandboxWebhookListSchema, unavailable });

  if (parts.length === 1 && parts[0] === "logs") {
    const searchParams = request.nextUrl.searchParams;
    const values = Object.fromEntries(searchParams);
    if (Object.keys(values).length !== searchParams.size || !webhookLogFilterSchema.safeParse(values).success) {
      return integrationResponse({ message: "Confira os filtros do histórico." }, 400);
    }
    return forwardIntegrationRequest(request, {
      path: `${path}/logs`, output: webhookDeliveryPageSchema, searchParams, unavailable,
    });
  }

  if (parts.length === 2 && parts[0] === "logs") {
    const delivery = webhookIdSchema.safeParse(parts[1]);
    if (delivery.success) return forwardIntegrationRequest(request, {
      path: `${path}/logs/${delivery.data}`, output: webhookDeliveryDetailSchema, unavailable,
    });
  }
  const webhook = webhookIdSchema.safeParse(parts[0]);
  if (parts.length === 1 && webhook.success) return forwardIntegrationRequest(request, {
    path: `${path}/${webhook.data}`, output: sandboxWebhookSchema, unavailable,
  });
  return integrationResponse({ message: "Rota indisponível." }, 404);
}

export async function POST(request: NextRequest, { params }: Context) {
  const path = base();
  const parts = (await params).operation ?? [];
  if (parts.length === 1 && parts[0] === "options") return forwardIntegrationRequest(request, {
    path: `${path}/options`, input: webhookActionSchema, output: passkeyOptionsSchema, unavailable,
  });
  if (parts.length === 1 && parts[0] === "actions") return forwardIntegrationRequest(request, {
    path: `${path}/actions`, input: confirmedWebhookActionSchema, output: webhookActionResultSchema, unavailable,
  });
  const webhook = webhookIdSchema.safeParse(parts[0]);
  if (parts.length === 2 && parts[1] === "verify" && webhook.success) return forwardIntegrationRequest(request, {
    path: `${path}/${webhook.data}/verify`, input: webhookVerificationSchema, output: sandboxWebhookSchema, timeoutMs: 12_000, unavailable,
  });
  return integrationResponse({ message: "Rota indisponível." }, 404);
}

