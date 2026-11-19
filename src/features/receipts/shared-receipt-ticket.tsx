"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { brandConfig } from "@/config/brand.config";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCentsToBrl } from "@/lib/money";
import { fetchSharedReceipt, receiptLinkUnavailable, shareTokenSchema, sharedReceiptUnavailable, type SharedReceipt } from "./pix-receipt-share";
import receiptStyles from "./receipts.module.css";
import styles from "./shared-receipt.module.css";

const receiptHeader = "grid justify-items-center gap-2 px-6 pt-7 pb-6 text-center";
const receiptDetails = "grid gap-5 px-5 py-5 sm:px-7";
const receiptSummary = "flex flex-wrap items-start justify-between gap-x-6 gap-y-3";
const receiptFooter = "grid gap-4 px-5 pt-5 pb-7 sm:px-7";

type ReceiptState =
  | { status: "loading" }
  | { status: "error"; message: string; retry: boolean }
  | { status: "ready"; data: SharedReceipt };

export function SharedReceiptTicket() {
  const [state, setState] = useState<ReceiptState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let request: AbortController | undefined;
    function load() {
      request?.abort();
      const token = shareTokenSchema.safeParse(window.location.hash.slice(1));
      if (!token.success) {
        setState({ status: "error", message: receiptLinkUnavailable, retry: false });
        return;
      }

      const controller = new AbortController();
      request = controller;
      setState({ status: "loading" });
      void fetchSharedReceipt(token.data, controller.signal).then((data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      }, (error: unknown) => {
        if (controller.signal.aborted) return;
        const missing = error instanceof ApiError && error.status === 404;
        setState({ status: "error", message: missing ? receiptLinkUnavailable : sharedReceiptUnavailable, retry: !missing });
      });
    }
    load();
    window.addEventListener("hashchange", load);
    return () => {
      request?.abort();
      window.removeEventListener("hashchange", load);
    };
  }, [attempt]);

  return (
    <article className={styles.ticket} aria-label="Comprovante Pix">
      {state.status === "loading" && <p role="status" className="sr-only">Abrindo comprovante…</p>}
      <SkeletonReveal flow className={receiptStyles.reveal} revealed={state.status !== "loading"} skeleton={<ReceiptDocumentSkeleton />}>
        {state.status === "ready" && <ReceiptDocument data={state.data} />}
        {state.status === "error" && (
          <div role="alert" className="grid justify-items-center gap-3 px-6 py-9 text-center">
            <LoadingConfirmation outcome="failure" size={44} />
            <h1 className="text-balance text-xl font-semibold">Comprovante indisponível</h1>
            <p className="text-pretty text-sm text-muted-foreground">{state.message}</p>
            {state.retry && (
              <Button type="button" variant="outline" className={styles.action} onClick={() => setAttempt((value) => value + 1)}>
                Tentar novamente
              </Button>
            )}
          </div>
        )}
      </SkeletonReveal>
    </article>
  );
}

function ReceiptDocumentSkeleton() {
  return (
    <div data-receipt-ticket-skeleton>
      <div className={receiptHeader}>
        <Skeleton className="h-5 w-16 animate-none" />
        <Skeleton className="size-11 animate-none rounded-full" />
        <Skeleton className="h-7 w-40 animate-none" />
        <Skeleton className="h-5 w-44 animate-none" />
        <Skeleton className="h-5 w-52 max-w-full animate-none" />
      </div>
      <div className={styles.perforation} />
      <div className={receiptDetails}>
        <div className={receiptSummary}>
          <div className="grid gap-1">
            <Skeleton className="h-4 w-20 animate-none" />
            <Skeleton className="h-8 w-32 animate-none" />
          </div>
          <div className="grid gap-1 sm:justify-items-end">
            <Skeleton className="h-4 w-24 animate-none" />
            <Skeleton className="h-5 w-28 animate-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Skeleton className="h-4 w-16 max-w-full animate-none" />
            <Skeleton className="h-5 w-20 max-w-full animate-none" />
          </div>
          <div className="grid gap-1">
            <Skeleton className="h-4 w-20 max-w-full animate-none" />
            <Skeleton className="h-5 w-24 max-w-full animate-none" />
          </div>
        </div>
        <div className="flex gap-3 rounded-lg bg-muted p-3">
          <Skeleton className="size-5 shrink-0 animate-none" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-3 w-44 max-w-full animate-none" />
            <Skeleton className="h-4 w-32 max-w-full animate-none" />
            <Skeleton className="h-4 w-28 max-w-full animate-none" />
          </div>
        </div>
      </div>
      <div className={styles.perforation} />
      <div className={receiptFooter}>
        <div className="grid min-w-0 gap-1">
          <Skeleton className="h-4 w-36 max-w-full animate-none" />
          <Skeleton className="h-5 w-44 max-w-full animate-none" />
        </div>
        <div className="grid min-w-0 gap-1">
          <Skeleton className="h-4 w-40 max-w-full animate-none" />
          <Skeleton className="h-5 w-60 max-w-full animate-none" />
        </div>
        <Skeleton className="h-11 w-60 max-w-full animate-none" />
        <Skeleton className="h-4 w-44 max-w-full animate-none" />
      </div>
    </div>
  );
}

function ReceiptDocument({ data: { receipt, expiresAt } }: { data: SharedReceipt }) {
  const incoming = receipt.direction === "IN";
  const settled = receipt.settledAt ?? receipt.settledDate;
  const party = receipt.counterparty;
  const hasParty = Boolean(party.name || party.document || party.institution || party.ispb);

  return (
    <>
      <header className={receiptHeader}>
        <p className="text-sm font-semibold">{brandConfig.name}</p>
        <LoadingConfirmation size={44} />
        <h1 className="text-balance text-xl font-semibold">Comprovante Pix</h1>
        <p className="text-sm text-muted-foreground">{receipt.kind === "refund" ? "Estorno Pix confirmado" : incoming ? "Recebimento confirmado" : "Saque confirmado"}</p>
        <p className="text-sm text-muted-foreground">{receipt.simulated ? "Simulação de saque · Asaas Sandbox" : "Operação de teste · Asaas Sandbox"}</p>
      </header>

      <div className={styles.perforation} aria-hidden="true" />

      <div className={receiptDetails}>
        <dl className="grid min-w-0 gap-4">
          <div className={receiptSummary}>
            <div className="min-w-0">
              <dt className={styles.label}>Valor do Pix</dt>
              <dd className="wrap-anywhere text-[clamp(1.25rem,7.7vw,1.875rem)] font-semibold tabular-nums">{formatCentsToBrl(receipt.amountInCents)}</dd>
            </div>
            {settled && (
              <div className="min-w-0 sm:text-right">
                <dt className={styles.label}>Efetivado em{receipt.settledAt && " · Brasília"}</dt>
                <dd className="text-sm font-medium tabular-nums">
                  <time dateTime={settled}>{formatDateTime(settled, receipt.settledAt ? "medium" : "date-only")}</time>
                </dd>
              </div>
            )}
          </div>
          {(receipt.feeInCents !== null || receipt.netInCents !== null) && (
            <div className="grid min-w-0 grid-cols-2 gap-4">
              {receipt.feeInCents !== null && (
                <div>
                  <dt className={styles.label}>Tarifa</dt>
                  <dd className="text-sm font-medium tabular-nums">{formatCentsToBrl(receipt.feeInCents)}</dd>
                </div>
              )}
              {receipt.netInCents !== null && (
                <div>
                  <dt className={styles.label}>Valor líquido</dt>
                  <dd className="text-sm font-medium tabular-nums">{formatCentsToBrl(receipt.netInCents)}</dd>
                </div>
              )}
            </div>
          )}
        </dl>

        {hasParty && (
          <section aria-labelledby="receipt-party" className="flex min-w-0 items-start gap-3 rounded-lg bg-muted p-3">
            <Landmark className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="grid min-w-0 gap-1">
              <h2 id="receipt-party" className={styles.label}>{incoming ? "Contraparte informada pelo Asaas" : "Beneficiário"}</h2>
              {party.name && <p className="wrap-anywhere text-sm font-semibold">{party.name}</p>}
              {party.document && <p className="text-sm tabular-nums">{party.document}</p>}
              {party.institution && <p className="wrap-anywhere text-sm text-muted-foreground">{party.institution}</p>}
              {party.ispb && <p className="text-xs tabular-nums text-muted-foreground">ISPB {party.ispb}</p>}
            </div>
          </section>
        )}
      </div>

      <div className={styles.perforation} aria-hidden="true" />

      <footer className={receiptFooter}>
        <dl className="grid min-w-0 gap-3">
          <div>
            <dt className={styles.label}>{incoming ? "ID da cobrança no Asaas" : "ID da transferência no Asaas"}</dt>
            <dd className="wrap-anywhere font-mono text-sm">{receipt.providerId}</dd>
          </div>
          {receipt.endToEndId && (
            <div>
              <dt className={styles.label}>Identificador Pix End-to-End</dt>
              <dd className="wrap-anywhere font-mono text-sm">{receipt.endToEndId}</dd>
            </div>
          )}
          {!settled && (
            <div>
              <dt className={styles.label}>Solicitado em · Brasília</dt>
              <dd className="text-sm tabular-nums"><time dateTime={receipt.createdAt}>{formatDateTime(receipt.createdAt)}</time></dd>
            </div>
          )}
        </dl>
        {receipt.officialUrl && (
          <Button asChild className={styles.action}>
            <a href={receipt.officialUrl} target="_blank" rel="noreferrer">
              Ver comprovante oficial do Asaas <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        )}
        <p className="no-print text-xs text-muted-foreground">
          Link disponível até <time dateTime={expiresAt}>{formatDateTime(expiresAt)}</time>.
        </p>
      </footer>
    </>
  );
}
