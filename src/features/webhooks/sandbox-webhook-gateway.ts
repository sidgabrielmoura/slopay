import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import type { IntegrationProof } from "@/features/integrations/integration-proof";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import {
  sandboxWebhookListSchema, sandboxWebhookSchema, webhookActionResultSchema,
  webhookDeliveryDetailSchema, webhookDeliveryPageSchema,
  type SandboxWebhookAction, type SandboxWebhookDelivery,
} from "./sandbox-webhooks";

const endpoint = "/api/integrations/webhooks";
const unavailable = "Os webhooks estão temporariamente indisponíveis.";

function post(value: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) };
}

export function sandboxWebhooksKey(accountId: string) {
  return ["sandbox-webhooks", accountId] as const;
}

export function sandboxWebhookKey(accountId: string, id?: string) {
  return [...sandboxWebhooksKey(accountId), id ?? "list"] as const;
}

export const sandboxWebhookGateway = {
  list: (signal?: AbortSignal) => requestPixGateway(endpoint, sandboxWebhookListSchema, unavailable, { signal }),
  get: (id: string, signal?: AbortSignal) => requestPixGateway(`${endpoint}/${id}`, sandboxWebhookSchema, unavailable, { signal }),
  options: (action: SandboxWebhookAction) => requestPixGateway(`${endpoint}/options`, passkeyOptionsSchema, unavailable, post(action)),
  apply: (action: SandboxWebhookAction, proof: IntegrationProof) =>
    requestPixGateway(`${endpoint}/actions`, webhookActionResultSchema, unavailable, post({ action, proof })),
  verify: (id: string, version: number) =>
    requestPixGateway(`${endpoint}/${id}/verify`, sandboxWebhookSchema, unavailable, post({ version })),
  logs: (filter: { webhookId?: string; state?: SandboxWebhookDelivery["state"]; before?: string }, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) if (value) params.set(key, value);
    return requestPixGateway(`${endpoint}/logs?${params}`, webhookDeliveryPageSchema, unavailable, { signal });
  },
  delivery: (id: string, signal?: AbortSignal) =>
    requestPixGateway(`${endpoint}/logs/${id}`, webhookDeliveryDetailSchema, unavailable, { signal }),
};

