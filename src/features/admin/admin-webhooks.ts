import { z } from "zod";
import { sandboxWebhookEvents, webhookAttemptSchema, webhookDeliveryState, webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { operationalPage, operationalSearch } from "./admin-operational-accounts";
import { adminPaginationSchema } from "./admin-pending";

export const adminWebhooksPath = "/admin/webhooks";
export const adminWebhooksUnavailable = "Não foi possível consultar os webhooks.";
export const adminWebhookHistoryUnavailable = "Não foi possível consultar as entregas do webhook.";
export const adminWebhookDeliveryUnavailable = "Não foi possível consultar as tentativas da entrega.";
const api = "/api/admin/webhooks";
const date = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();

export const adminWebhookStatusFilter = z.enum(["ALL", "ACTIVE", "INTERRUPTED", "PAUSED", "UNVERIFIED"]);
export const adminWebhookQuery = z.strictObject({
  search: operationalSearch.default(""), status: adminWebhookStatusFilter.default("ALL"), page: operationalPage.default(1),
});
export const adminDeliveryStateFilter = z.enum(["ALL", ...webhookDeliveryState.options]);
export const webhookHistoryQuery = z.strictObject({ state: adminDeliveryStateFilter.default("ALL"), page: operationalPage.default(1) });
export const webhookAttemptQuery = z.strictObject({ page: operationalPage.default(1) });
const webhookSummary = z.object({
  destinations: count, interrupted: count, completedAttempts: count, successfulAttempts: count,
  averageDurationMs: count.nullable(), retries: count,
});
const webhook = z.object({
  id: webhookIdSchema, name: z.string(), company: z.string(),
  host: z.string().regex(/^[a-z0-9.-]{1,253}$/).nullable(),
  events: z.array(z.enum(sandboxWebhookEvents)).min(1).max(sandboxWebhookEvents.length),
  mode: z.enum(["SEQUENTIAL", "PARALLEL"]),
  status: z.enum(["ACTIVE", "INTERRUPTED", "PAUSED", "UNVERIFIED", "REMOVED"]),
  retryEnabled: z.boolean(), createdAt: date, interruptedAt: date.nullable(), verifiedAt: date.nullable(),
});
const delivery = z.object({
  id: webhookIdSchema, eventId: webhookIdSchema, eventType: z.enum(sandboxWebhookEvents), state: webhookDeliveryState,
  attemptCount: count, sending: z.boolean(), previousDestination: z.boolean(),
  createdAt: date, nextAttemptAt: date.nullable(), completedAt: date.nullable(),
});
export const adminWebhooksSchema = z.object({
  environment: z.literal("sandbox"), summary: webhookSummary, items: z.array(webhook).max(8), pagination: adminPaginationSchema,
});
export const adminWebhookHistorySchema = z.object({
  webhook, queued: count, blockedDeliveryId: webhookIdSchema.nullable(), pagination: adminPaginationSchema,
  items: z.array(delivery.extend({ lastAttempt: webhookAttemptSchema.nullable() })).max(8),
});
export const adminWebhookDeliverySchema = z.object({
  delivery, pagination: adminPaginationSchema, attempts: z.array(webhookAttemptSchema).max(8),
});

export type AdminWebhookQuery = z.infer<typeof adminWebhookQuery>;
export type WebhookHistoryQuery = z.infer<typeof webhookHistoryQuery>;
export type AdminWebhook = z.infer<typeof webhook>;
export type AdminWebhookDelivery = z.infer<typeof delivery>;
export type AdminWebhookHistory = z.infer<typeof adminWebhookHistorySchema>;
export type AdminWebhookSummary = z.infer<typeof webhookSummary>;

export const adminWebhookStatuses = {
  ACTIVE: { label: "Ativo", variant: "success" },
  INTERRUPTED: { label: "Fila interrompida", variant: "warning" },
  PAUSED: { label: "Pausado", variant: "secondary" },
  UNVERIFIED: { label: "Aguardando verificação", variant: "info" },
  REMOVED: { label: "Removido", variant: "secondary" },
} as const;

export function adminWebhookQueryFrom(params: Pick<URLSearchParams, "get">): AdminWebhookQuery {
  return {
    search: operationalSearch.catch("").parse(params.get("search")),
    status: adminWebhookStatusFilter.catch("ALL").parse(params.get("status")),
    page: operationalPage.catch(1).parse(params.get("page")),
  };
}

export function adminWebhookParams(query: AdminWebhookQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function adminWebhookHref(query: AdminWebhookQuery, id?: string, history?: WebhookHistoryQuery, deliveryId?: string | null) {
  const params = adminWebhookParams(query);
  if (history?.state && history.state !== "ALL") params.set("state", history.state);
  if (history && history.page > 1) params.set("historyPage", String(history.page));
  if (deliveryId) params.set("entrega", deliveryId);
  return adminWebhooksPath + (id ? "/" + id : "") + (params.size ? "?" + params : "");
}

export function webhookHistoryQueryFrom(params: Pick<URLSearchParams, "get">): WebhookHistoryQuery {
  return {
    state: adminDeliveryStateFilter.catch("ALL").parse(params.get("state")),
    page: operationalPage.catch(1).parse(params.get("historyPage")),
  };
}

export const adminWebhooks = {
  list: (query: AdminWebhookQuery, signal: AbortSignal) =>
    requestPixGateway(api + "?" + adminWebhookParams(query), adminWebhooksSchema, adminWebhooksUnavailable, { signal }),
  history: (id: string, query: WebhookHistoryQuery, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}?` + new URLSearchParams({ state: query.state, page: String(query.page) }),
      adminWebhookHistorySchema, adminWebhookHistoryUnavailable, { signal }),
  delivery: (id: string, deliveryId: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}/deliveries/${deliveryId}?page=${page}`, adminWebhookDeliverySchema, adminWebhookDeliveryUnavailable, { signal }),
};
