import type { SandboxWebhookAttempt } from "./sandbox-webhooks";

export const webhookDeliveryLabels = {
  PENDING: "Na fila", DELIVERED: "Entregue", EXHAUSTED: "Tentativas encerradas", CANCELLED: "Cancelada",
} as const;
export const webhookAttemptLabels = {
  SENDING: "Em envio", DELIVERED: "Entregue", FAILED: "Falhou", UNKNOWN: "Resultado desconhecido",
} as const;

const failureLabels: Record<string, string> = {
  UNSAFE_DESTINATION: "Destino bloqueado",
  DNS_UNAVAILABLE: "Destino indisponível no DNS",
  TIMEOUT: "Tempo de resposta excedido",
  NETWORK_ERROR: "Falha de conexão",
  HTTP_REJECTED: "Resposta recusada pelo destino",
  INTERNAL_ERROR: "Erro interno",
  LEASE_EXPIRED: "Confirmação da tentativa indisponível",
  DISPATCH_EXPIRED: "Autorização de envio vencida",
  DESTINATION_CHANGED: "Configuração anterior encerrada",
};

export function webhookAttemptMessage({ httpStatus, errorCode, state }: SandboxWebhookAttempt) {
  if (httpStatus !== null) return `HTTP ${httpStatus}`;
  return errorCode && Object.hasOwn(failureLabels, errorCode) ? failureLabels[errorCode] : webhookAttemptLabels[state];
}
