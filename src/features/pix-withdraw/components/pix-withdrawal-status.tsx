"use client";

import type { Ref } from "react";
import { ArrowUpRight, Clock3, TriangleAlert, X } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { expenseCategoryPresentation } from "@/features/expenses/expenses";
import { PixFlowTitle } from "@/features/pix-receive/components/pix-operation-surface";
import { ShareReceiptButton } from "@/features/receipts/share-receipt-button";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { isWithdrawalFinal, pixKeyLabels, type PixWithdrawal, withdrawalIssue, withdrawalStatusLabel } from "../pix-withdrawal";

function StatusIcon({ state, large, animate, onEnd }: {
  state?: PixWithdrawal["state"];
  large?: boolean;
  animate: boolean;
  onEnd: () => void;
}) {
  if (state === "DONE" || state === "FAILED") {
    return <LoadingConfirmation outcome={state === "DONE" ? "success" : "failure"} animate={animate} onEnd={onEnd} size={large ? 96 : 48} />;
  }
  const needsAttention = state === "BLOCKED" || state === "REVIEW" || state === "CANCELLED";
  const Icon = needsAttention ? TriangleAlert : Clock3;
  return (
    <span aria-hidden="true" className={cn(
      "grid shrink-0 place-items-center rounded-full",
      needsAttention ? "bg-warning-surface text-warning" : "bg-info-surface text-info",
      large ? "size-14" : "size-10",
    )}>
      <Icon className={large ? "size-6" : "size-[18px]"} />
    </span>
  );
}

export function PixWithdrawalDetails({ withdrawal, heading, inline, animate, onEnd, onClose, onNew }: {
  withdrawal: PixWithdrawal;
  heading: Ref<HTMLHeadingElement>;
  inline: boolean;
  animate: boolean;
  onEnd: () => void;
  onClose?: () => void;
  onNew?: () => void;
}) {
  const effective = withdrawal.effectiveAt ?? withdrawal.effectiveDate;
  const issue = withdrawalIssue(withdrawal);
  const showNew = onNew && (isWithdrawalFinal(withdrawal.state) || withdrawal.state === "REVIEW");
  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-2 text-center">
        <StatusIcon state={withdrawal.state} large animate={animate} onEnd={onEnd} />
        <PixFlowTitle inline={inline} ref={heading} tabIndex={-1} className="outline-none" aria-live="polite">
          {withdrawalStatusLabel(withdrawal)}
        </PixFlowTitle>
        <p className="text-4xl font-bold tracking-tight tabular-nums"><PanelAmount cents={withdrawal.amountInCents} /></p>
        <p className="text-sm text-muted-foreground">{withdrawal.simulated ? "Saque simulado · Asaas Sandbox" : "Asaas Sandbox"}</p>
        {issue && <p className="max-w-sm text-pretty text-sm">{issue}</p>}
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-muted-foreground">Destino</dt>
          <dd className="text-right">{pixKeyLabels[withdrawal.pixKeyType]} · {withdrawal.destination}</dd>
        </div>
        {withdrawal.feeInCents !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Tarifa</dt>
            <dd><PanelAmount cents={withdrawal.feeInCents} /></dd>
          </div>
        )}
        {withdrawal.expenseCategory && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Categoria</dt>
            <dd>{expenseCategoryPresentation[withdrawal.expenseCategory].label}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Solicitado em</dt>
          <dd><time dateTime={withdrawal.createdAt}>{formatDateTime(withdrawal.createdAt)}</time></dd>
        </div>
        {effective && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Efetivado em</dt>
            <dd><time dateTime={effective}>{formatDateTime(effective, withdrawal.effectiveAt ? "medium" : "date-only")}</time></dd>
          </div>
        )}
        {withdrawal.confirmedAt && !withdrawal.effectiveAt && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Confirmação registrada em</dt>
            <dd><time dateTime={withdrawal.confirmedAt}>{formatDateTime(withdrawal.confirmedAt)}</time></dd>
          </div>
        )}
        {withdrawal.state === "REVIEW" && (
          <div className="grid gap-1">
            <dt className="text-muted-foreground">{withdrawal.asaasTransferId ? "ID no Asaas" : "Referência externa"}</dt>
            <dd className="break-all font-mono text-xs">{withdrawal.asaasTransferId ?? "slopay-sandbox-withdrawal-" + withdrawal.id}</dd>
          </div>
        )}
      </dl>
      {withdrawal.state === "DONE" && withdrawal.asaasTransferId && (
        <ShareReceiptButton key={withdrawal.id} reference={"saque-" + withdrawal.id} />
      )}
      {(onClose || showNew) && (
        <div className="flex gap-2">
          {onClose && <Button type="button" variant="outline" className="h-11 flex-1" onClick={onClose}>Fechar</Button>}
          {showNew && <Button type="button" className="h-11 flex-1" onClick={onNew}>Novo saque</Button>}
        </div>
      )}
    </div>
  );
}

export function PixWithdrawalCard({ withdrawal, animate, onEnd, onOpen, onDismiss }: {
  withdrawal: PixWithdrawal;
  animate: boolean;
  onEnd: () => void;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <aside aria-label="Acompanhamento de saque Pix" className="pointer-events-auto shrink-0 rounded-xl border border-border bg-card p-4 text-foreground shadow-xl">
      <div className="flex items-start gap-3">
        <StatusIcon state={withdrawal.state} animate={animate} onEnd={onEnd} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{withdrawalStatusLabel(withdrawal)}</p>
          <p className="mt-0.5 break-words text-lg font-semibold tabular-nums"><PanelAmount cents={withdrawal.amountInCents} /></p>
          <p className="text-xs text-muted-foreground">{withdrawal.simulated ? "Saque simulado · Asaas Sandbox" : "Asaas Sandbox"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar aviso de saque Pix" onClick={onDismiss}><X /></Button>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onOpen}>
        <ArrowUpRight aria-hidden="true" />
        Ver saque
      </Button>
    </aside>
  );
}
