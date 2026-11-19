import type { WebhookConfig } from "@/types/domain";

export type ApiKeyEnvironment = "sandbox" | "production";

export const apiKeyEnvironments = {
  sandbox: "Sandbox",
  production: "Produção",
} satisfies Record<ApiKeyEnvironment, string>;

export type PreviewApiKey = {
  id: string;
  name: string;
  environment: ApiKeyEnvironment;
  suffix: string;
  enabled: boolean;
  createdAt: string;
  expiresOn: string | null;
  lastUsedAt: string | null;
};

export const previewApiKeys: PreviewApiKey[] = [
  { id: "key_erp", name: "ERP · Conciliação", environment: "production", suffix: "e74a", enabled: true,
    createdAt: "2026-10-28T13:30:00Z", expiresOn: null, lastUsedAt: "2026-11-16T14:24:08Z" },
  { id: "key_checkout", name: "Checkout · Sandbox", environment: "sandbox", suffix: "9c12", enabled: true,
    createdAt: "2026-11-03T17:10:00Z", expiresOn: "2027-02-03", lastUsedAt: "2026-11-16T13:12:15Z" },
  { id: "key_import", name: "Importação de cobranças", environment: "sandbox", suffix: "1a66", enabled: false,
    createdAt: "2026-10-22T12:12:00Z", expiresOn: null, lastUsedAt: "2026-11-06T11:10:26Z" },
];

export type PreviewIpRange = { id: string; start: string; end?: string };

export const previewIpRanges: PreviewIpRange[] = [
  { id: "ip_erp", start: "192.0.2.18" },
  { id: "ip_checkout", start: "198.51.100.24", end: "198.51.100.29" },
];

export type PreviewWithdrawalValidation = {
  enabled: boolean;
  url: string;
  email: string;
  hasToken: boolean;
  includePanel: boolean;
};

export const previewWithdrawalValidation: PreviewWithdrawalValidation = {
  enabled: true,
  url: "https://financeiro.example.com/validar-saida",
  email: "operacoes@example.com",
  hasToken: true,
  includePanel: false,
};

export const previewWebhooks: WebhookConfig[] = [
  {
    id: "wh_conciliacao", name: "Conciliação Pix", eventType: "PIX_RECEIVED", eventTypes: ["PIX_RECEIVED", "PIX_SENT"],
    url: "https://erp.example.com/webhooks/slopay", notificationEmail: "operacoes@example.com",
    deliveryMode: "SEQUENTIAL", queueInterrupted: false, hasAuthToken: true,
    retryEnabled: true, headers: [], active: true, createdAt: "2026-11-04T13:30:00Z",
  },
  {
    id: "wh_aprovacoes", name: "Fila de aprovações", eventType: "APPROVAL_REQUIRED",
    url: "https://financeiro.example.com/webhooks/aprovacoes", notificationEmail: "financeiro@example.com",
    deliveryMode: "PARALLEL", queueInterrupted: true, hasAuthToken: true,
    retryEnabled: true, headers: [], active: true, createdAt: "2026-11-10T15:30:00Z",
  },
  {
    id: "wh_checkout", name: "Checkout de teste", eventType: "PIX_RECEIVED",
    url: "https://sandbox.example.com/webhooks/pix", notificationEmail: "integracoes@example.com",
    deliveryMode: "SEQUENTIAL", queueInterrupted: false, hasAuthToken: false,
    retryEnabled: true, headers: [], active: false, createdAt: "2026-11-12T18:05:00Z",
  },
];
