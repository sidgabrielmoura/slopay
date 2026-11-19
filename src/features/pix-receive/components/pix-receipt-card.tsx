"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, Clock3, TriangleAlert, X } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { LoadingConfirmation, LoadingIndicator } from "@/components/ui/loading-indicator";
import { cn } from "@/lib/utils";
import type { PixReceipt } from "../pix-receipt";

export const receiptStatusLabels = {
  preparing: "Preparando cobrança",
  pending: "Aguardando pagamento",
  paid: "Pix recebido",
  review: "Cobrança em revisão",
  expired: "Cobrança expirada",
  cancelled: "Cobrança cancelada",
  failed: "Falha na cobrança",
  unavailable: "Consulta da cobrança indisponível",
  "refund-pending": "Estorno em processamento",
  refunded: "Pix estornado",
  "partially-refunded": "Pix parcialmente estornado",
};

export function PixReceiptCard({ receipt, environment, checkingError, onOpen, onDismiss, onCheck, animateOutcome, onOutcomeEnd }: {
  receipt: PixReceipt;
  environment: "demo" | "sandbox";
  checkingError: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  onCheck: () => Promise<unknown>;
  animateOutcome: boolean;
  onOutcomeEnd: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const { status } = receipt;
  const waiting = status === "preparing" || status === "pending";
  const paid = status === "paid";
  const statusLabel = receiptStatusLabels[status];
  const Icon = waiting ? Clock3 : TriangleAlert;

  async function check() {
    setChecking(true);
    try {
      await onCheck();
    } finally {
      setChecking(false);
    }
  }

  return (
    <aside
      aria-label="Recebimento Pix"
      className="pointer-events-auto shrink-0 rounded-xl border border-border bg-card p-4 text-foreground shadow-xl"
    >
      <div className="flex items-start gap-3">
        {paid || status === "failed" ? (
          <LoadingConfirmation
            animate={animateOutcome}
            onEnd={onOutcomeEnd}
            outcome={paid ? "success" : "failure"}
            size={40}
          />
        ) : status === "preparing" ? (
          <LoadingIndicator size={40} />
        ) : (
          <span aria-hidden="true" className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full",
            waiting ? "bg-info-surface text-info" : "bg-warning-surface text-warning",
          )}>
            <Icon className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{statusLabel}</p>
          <p className="mt-0.5 break-words text-lg font-semibold tabular-nums">
            <PanelAmount cents={receipt.amountInCents} />
          </p>
          <p className="text-xs text-muted-foreground">{environment === "demo" ? "Demonstração" : "Asaas Sandbox"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar aviso de recebimento Pix" onClick={onDismiss}>
          <X />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {waiting ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onOpen} className="cursor-pointer">
              {status === "pending" && environment === "sandbox" ? "Ver QR Code" : "Ver cobrança"}
            </Button>
            {checkingError && (
              <Button type="button" variant="ghost" size="sm" disabled={checking} onClick={check}>
                {checking ? "Consultando…" : "Consultar status"}
              </Button>
            )}
          </>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={environment === "demo" ? "/pix/cobrancas/" + receipt.id : "/movimentacoes/" + receipt.id}>
              <ArrowDownLeft aria-hidden="true" />
              Ver detalhes
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
