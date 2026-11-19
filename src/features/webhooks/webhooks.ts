import type { IGatewayService } from "@/services/contracts";
import type { WebhookConfig, WebhookEventType } from "@/types/domain";

export const webhooksPath = "/integracoes/webhooks";
export const newWebhookPath = webhooksPath + "/novo";

const eventGroups = [
  { id: "receipts", label: "Recebimentos Pix" },
  { id: "withdrawals", label: "Saques Pix" },
] as const;

type EventGroupId = (typeof eventGroups)[number]["id"];

export const webhookEvents: Record<WebhookEventType, {
  label: string;
  description: string;
  group: EventGroupId;
}> = {
  PIX_CHARGE_CREATED: { label: "Cobrança criada", description: "Uma cobrança Pix foi criada e aguarda pagamento.", group: "receipts" },
  PIX_RECEIVED: { label: "Pix recebido", description: "Confirmação de um recebimento Pix.", group: "receipts" },
  PIX_CHARGE_EXPIRED: { label: "Cobrança expirada", description: "A validade da cobrança terminou sem confirmação de pagamento.", group: "receipts" },
  PIX_REFUNDED: { label: "Estorno Pix concluído", description: "A devolução total ou parcial de um Pix foi confirmada.", group: "receipts" },
  WITHDRAWAL_REQUESTED: { label: "Saque solicitado", description: "Um novo pedido de saque Pix foi registrado.", group: "withdrawals" },
  APPROVAL_REQUIRED: { label: "Aprovação pendente", description: "Um saque foi encaminhado para aprovação.", group: "withdrawals" },
  PIX_SENT: { label: "Pix enviado", description: "Conclusão de uma transferência Pix.", group: "withdrawals" },
  WITHDRAWAL_FAILED: { label: "Saque falhou", description: "O processamento terminou sem concluir o saque Pix.", group: "withdrawals" },
};

const eventTypes = Object.keys(webhookEvents) as WebhookEventType[];

export const webhookEventGroups = eventGroups.map((group) => ({
  ...group,
  events: eventTypes.filter((event) => webhookEvents[event].group === group.id),
}));

export type WebhookValues = Omit<WebhookConfig, "id" | "createdAt">;

export type WebhookWorkspace = {
  service: Pick<IGatewayService, "getWebhooks" | "createWebhook" | "updateWebhook" | "deleteWebhook">;
  queryKey: readonly string[];
  readOnly: boolean;
};

export const webhookDeliveryOptions = [
  { value: "SEQUENTIAL", label: "Sequencial" },
  { value: "PARALLEL", label: "Não sequencial" },
];

export function subscribedEvents(webhook: Pick<WebhookConfig, "eventType" | "eventTypes">) {
  return webhook.eventTypes?.length ? webhook.eventTypes : [webhook.eventType];
}

export function webhookError(webhook: WebhookValues) {
  if (!Object.hasOwn(webhookEvents, webhook.eventType) ||
      !subscribedEvents(webhook).every((event) => Object.hasOwn(webhookEvents, event))) {
    return { field: "event", message: "Selecione um evento válido." } as const;
  }
  const url = webhook.url.trim();
  const address = URL.canParse(url) ? new URL(url) : null;
  if (!/^https:\/\//i.test(url) || !address?.hostname || address.username || address.password || address.hash) {
    return { field: "url", message: "Informe uma URL HTTPS válida, sem credenciais ou fragmento." } as const;
  }

  const headerNames = new Set<string>();
  for (const { key, value } of webhook.headers) {
    const name = key.trim().toLowerCase();
    // Headers validates the HTTP field name. Demo values can contain masked characters.
    try {
      new Headers().set(name, "");
    } catch {
      return { field: "headers", message: "Confira os nomes dos cabeçalhos HTTP." } as const;
    }
    if (headerNames.has(name)) return { field: "headers", message: "Use um nome diferente para cada cabeçalho." } as const;
    if (/[\r\n\u0000]/.test(value)) return { field: "headers", message: "Os valores dos cabeçalhos devem ocupar uma única linha." } as const;
    headerNames.add(name);
  }
}

const eventExamples = {
  PIX_CHARGE_CREATED: { paymentId: "pay_demo_0038", amountInCents: 15000, status: "PENDING" },
  PIX_RECEIVED: { transactionId: "tx_demo_recebimento", amountInCents: 15000, status: "COMPLETED" },
  PIX_CHARGE_EXPIRED: { paymentId: "pay_demo_0038", amountInCents: 15000, status: "EXPIRED" },
  PIX_REFUNDED: { transactionId: "tx_demo_recebimento", amountInCents: 15000, status: "REFUNDED" },
  WITHDRAWAL_REQUESTED: { withdrawalId: "saque_demo_0014", amountInCents: 15000, status: "QUEUED" },
  APPROVAL_REQUIRED: { approvalRequestId: "appr_demo", amountInCents: 750000, status: "PENDING" },
  PIX_SENT: { transactionId: "tx_demo_envio", amountInCents: 15000, status: "COMPLETED" },
  WITHDRAWAL_FAILED: { withdrawalId: "saque_demo_0014", amountInCents: 15000, status: "FAILED", reason: "PROVIDER_FAILED" },
} satisfies Record<WebhookEventType, { amountInCents: number; status: string } & Record<string, string | number>>;

export function demoWebhookPayload(event: WebhookEventType) {
  return JSON.stringify({ event, timestamp: new Date().toISOString(), data: eventExamples[event] }, null, 2);
}
