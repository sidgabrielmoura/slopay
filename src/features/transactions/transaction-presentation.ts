import type { BadgeProps } from "@/components/ui/badge";
import type { TransactionDirection, TransactionStatus } from "@/types/domain";
import type { LiveTransaction } from "./live-transactions";

export const transactionTabs = {
  ALL: { path: "/movimentacoes", label: "Extrato Consolidado" },
  IN: { path: "/movimentacoes/recebimentos", label: "Recebimentos Pix" },
  OUT: { path: "/movimentacoes/saidas", label: "Saídas Pix" },
  SEARCH: { path: "/movimentacoes/buscar", label: "Busca Avançada" },
} as const;

export type TransactionTab = keyof typeof transactionTabs;
export type StatementStatus = LiveTransaction["status"] | TransactionStatus;

export const statusPresentation: Record<StatementStatus, { label: string; variant: BadgeProps["variant"] }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
  PENDING: { label: "Aguardando", variant: "warning" },
  PENDING_APPROVAL: { label: "Aguardando aprovação", variant: "warning" },
  PROCESSING: { label: "Processando", variant: "info" },
  REVIEW: { label: "Em revisão", variant: "warning" },
  BLOCKED: { label: "Bloqueado", variant: "warning" },
  FAILED: { label: "Falhou", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "secondary" },
  REJECTED: { label: "Recusado", variant: "destructive" },
  REVERSED: { label: "Estornado", variant: "secondary" },
  UNKNOWN: { label: "Indefinido", variant: "secondary" },
};

export function transactionStatusLabel(status: StatementStatus, direction: TransactionDirection) {
  if (status === "PENDING") {
    return direction === "IN" ? "Aguardando pagamento" : "Aguardando confirmação";
  }
  return statusPresentation[status].label;
}

export function transactionName(direction: TransactionDirection) {
  return direction === "IN" ? "Recebimento Pix" : "Saque Pix";
}
