import { webhookEvents } from "@/features/webhooks/webhooks";
import type { WebhookEventType } from "@/types/domain";
import { previewWebhooks } from "./preview-data";

export type LogTab = "requisicoes" | "webhooks";

type IntegrationLogFields = {
  id: string;
  at: string;
  status: number | null;
  durationMs: number;
  reference: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
  error?: string;
};

export type RequestLog = IntegrationLogFields & {
  kind: "requisicoes";
  method: "GET" | "POST" | "DELETE";
  path: string;
  keyName: string;
};

export type WebhookLog = IntegrationLogFields & {
  kind: "webhooks";
  event: WebhookEventType;
  endpoint: string;
  attempt: number;
};

export type IntegrationLog = RequestLog | WebhookLog;

const requestLogs: RequestLog[] = [
  {
    kind: "requisicoes", id: "req_demo_b248", at: "2026-11-16T14:24:08Z", status: 201, durationMs: 186,
    method: "POST", path: "/v1/cobrancas", keyName: "ERP · Conciliação", reference: "pay_demo_0038",
    request: { method: "PIX", amountInCents: 25900, reference: "pedido_demo_1138" },
    response: { id: "pay_demo_0038", status: "PENDING", amountInCents: 25900 },
  },
  {
    kind: "requisicoes", id: "req_demo_61b9", at: "2026-11-16T14:18:37Z", status: 400, durationMs: 72,
    method: "POST", path: "/v1/saques", keyName: "ERP · Conciliação", reference: "saque_demo_0014",
    request: { amountInCents: 0, pixKeyType: "EMAIL", pixKey: "pix@example.com" },
    response: { code: "INVALID_AMOUNT", message: "Informe um valor maior que zero." },
  },
  {
    kind: "requisicoes", id: "req_demo_09a2", at: "2026-11-16T13:12:15Z", status: 200, durationMs: 93,
    method: "GET", path: "/v1/cobrancas/pay_demo_0035", keyName: "Checkout · Sandbox", reference: "pay_demo_0035",
    response: { id: "pay_demo_0035", status: "RECEIVED", amountInCents: 4500 },
  },
  {
    kind: "requisicoes", id: "req_demo_18c2", at: "2026-11-13T15:40:10Z", status: 403, durationMs: 26,
    method: "GET", path: "/v1/cobrancas", keyName: "ERP · Conciliação", reference: "",
    response: { code: "IP_NOT_ALLOWED", message: "Origem fora da lista de IPs autorizados." },
  },
];

const webhookLogs: WebhookLog[] = [
  {
    kind: "webhooks", id: "evt_demo_de31", at: "2026-11-16T14:27:31Z", status: 200, durationMs: 218,
    event: "PIX_RECEIVED", endpoint: previewWebhooks[0].url, attempt: 1, reference: "pay_demo_0038",
    request: { event: "PIX_RECEIVED", data: { transactionId: "tx_demo_0984", paymentId: "pay_demo_0038", amountInCents: 25900, status: "COMPLETED" } },
    response: { received: true },
  },
  {
    kind: "webhooks", id: "evt_demo_aa52", at: "2026-11-16T14:22:09Z", status: null, durationMs: 10000,
    event: "APPROVAL_REQUIRED", endpoint: previewWebhooks[1].url, attempt: 3, reference: "appr_demo_0041",
    request: { event: "APPROVAL_REQUIRED", data: { approvalRequestId: "appr_demo_0041", status: "PENDING" } },
    error: "O endpoint não respondeu dentro do tempo limite.",
  },
  {
    kind: "webhooks", id: "evt_demo_49b7", at: "2026-11-16T13:42:03Z", status: 503, durationMs: 501,
    event: "PIX_SENT", endpoint: previewWebhooks[0].url, attempt: 1, reference: "tx_demo_0982",
    request: { event: "PIX_SENT", data: { transactionId: "tx_demo_0982", amountInCents: 78500, status: "COMPLETED" } },
    response: { message: "Serviço temporariamente indisponível." },
  },
  {
    kind: "webhooks", id: "evt_demo_91a4", at: "2026-11-13T12:34:22Z", status: 200, durationMs: 164,
    event: "PIX_RECEIVED", endpoint: previewWebhooks[0].url, attempt: 2, reference: "pay_demo_0035",
    request: { event: "PIX_RECEIVED", data: { transactionId: "tx_demo_0972", paymentId: "pay_demo_0035", amountInCents: 4500, status: "COMPLETED" } },
    response: { received: true },
  },
];

export const previewLogs: Record<LogTab, IntegrationLog[]> = { requisicoes: requestLogs, webhooks: webhookLogs };

export function logTabFromQuery(value: string | string[] | undefined): LogTab {
  return value === "webhooks" ? "webhooks" : "requisicoes";
}

export function logTitle(log: IntegrationLog) {
  return log.kind === "requisicoes" ? `${log.method} ${log.path}` : webhookEvents[log.event].label;
}

export function logSucceeded(log: IntegrationLog) {
  return log.status !== null && log.status >= 200 && log.status < 300;
}
