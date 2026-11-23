"use client";


import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { fetchLiveTransactions, type LiveTransaction } from "@/features/transactions/live-transactions";
import { transactionName } from "@/features/transactions/transaction-presentation";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { canSharePixReceipt } from "./pix-receipt-share";
import { ShareReceiptButton } from "./share-receipt-button";
import styles from "./receipts.module.css";

const receiptGrid = "grid min-w-0 grid-cols-2 items-center gap-x-4 px-4 sm:px-5 lg:grid-cols-[minmax(10rem,1fr)_minmax(7rem,8.5rem)_minmax(6rem,8rem)_15rem] lg:gap-x-3 xl:gap-x-5";
const receiptRow = cn(receiptGrid, "gap-y-3 py-4");
const operationCell = "col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1";
const actionCell = "col-span-2 min-w-0 lg:col-span-1 lg:justify-self-end";

export function ReceiptsScreen({ merchantId }: { merchantId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["pix-receipts", merchantId, page],
    queryFn: ({ signal }) => fetchLiveTransactions({ status: "COMPLETED", page }, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const data = query.data;
  const rows = data?.data.filter((operation) => canSharePixReceipt(data.environment, operation)) ?? [];
  const pending = query.isLoading || query.isPlaceholderData;
  const previousDisabled = pending || !data || data.page <= 1;
  const nextDisabled = pending || !data || data.page >= data.totalPages;

  return (
    <section aria-label="Comprovantes Pix" className="min-w-0">
      {pending && <p role="status" className="sr-only">Carregando comprovantes…</p>}
      <Card className="min-w-0 overflow-hidden">
        {(pending || rows.length > 0) && (
          <div aria-hidden="true" className={cn(receiptGrid, "hidden border-b border-border bg-muted/40 py-3 text-xs font-medium text-muted-foreground lg:grid")}>
            <span>Operação</span>
            <span>Efetivado em</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Ações</span>
          </div>
        )}
        <SkeletonReveal
          flow
          className={styles.reveal}
          revealed={!pending}
          skeleton={<ReceiptListSkeleton count={query.isPlaceholderData ? Math.max(1, rows.length) : 4} />}
        >
          {!pending && (data ? (
            rows.length > 0 ? (
              <ul className="divide-y divide-border">
                {rows.map((operation) => <ReceiptRow key={operation.reference} operation={operation} />)}
              </ul>
            ) : (
              <Empty icon={<ReceiptText aria-hidden="true" />} title="Nenhum comprovante disponível"
                className="border-0"
                description="Os comprovantes aparecem após a confirmação do recebimento ou saque Pix."
                action={<Button asChild variant="outline" className="h-11"><Link href="/movimentacoes" prefetch={false}>Ver movimentações</Link></Button>} />
            )
          ) : (
            <div className="grid gap-3 p-5">
              <OperationFailure message="Não foi possível consultar os comprovantes. Tente novamente." />
              <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => void query.refetch()}>
                Consultar novamente
              </Button>
            </div>
          ))}
        </SkeletonReveal>
        {data && data.totalPages > 1 && (
          <nav aria-label="Paginação dos comprovantes" className="flex items-center justify-end gap-3 border-t border-border px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" size="icon" className="size-11 aria-disabled:opacity-50" aria-label="Página anterior"
              aria-disabled={previousDisabled} onClick={() => { if (!previousDisabled) setPage(data.page - 1); }}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="text-sm tabular-nums">{pending ? page : data.page} de {data.totalPages}</span>
            <Button type="button" variant="outline" size="icon" className="size-11 aria-disabled:opacity-50" aria-label="Próxima página"
              aria-disabled={nextDisabled} onClick={() => { if (!nextDisabled) setPage(data.page + 1); }}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        )}
      </Card>
    </section>
  );
}

function ReceiptRow({ operation }: { operation: LiveTransaction }) {
  const incoming = operation.direction === "IN";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  const date = operation.settledAt ?? operation.settledDate;
  return (
    <li className={receiptRow}>
      <div className={operationCell}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg",
          incoming ? "bg-success-surface text-success" : "bg-info-surface text-info")}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <Link prefetch={false} href={"/movimentacoes/" + encodeURIComponent(operation.reference)}
          className="grid min-h-11 min-w-0 content-center gap-0.5 rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span className="text-sm font-semibold">{operation.reference.startsWith("estorno-") ? "Estorno Pix" : operation.simulated ? "Saque Pix simulado" : transactionName(operation.direction)}</span>
          {operation.providerId && (
            <span className="truncate font-mono text-xs text-muted-foreground" title={operation.providerId}>{operation.providerId}</span>
          )}
        </Link>
      </div>
      <div className="grid min-w-0 gap-0.5">
        <span className="text-xs text-muted-foreground lg:sr-only">Efetivado em</span>
        {date ? (
          <time dateTime={date} className="text-sm tabular-nums">
            {formatDateTime(date, operation.settledAt ? "medium" : "date-only")}
          </time>
        ) : <span className="text-sm text-muted-foreground">Data indisponível</span>}
      </div>
      <div className="grid min-w-0 gap-0.5 text-right">
        <span className="text-xs text-muted-foreground lg:sr-only">Valor</span>
        <span className="wrap-anywhere text-sm font-semibold tabular-nums">
          <PanelAmount cents={operation.amountInCents} />
        </span>
      </div>
      <div className={actionCell}><ShareReceiptButton reference={operation.reference} /></div>
    </li>
  );
}

function ReceiptListSkeleton({ count }: { count: number }) {
  return (
    <div className="divide-y divide-border" data-receipt-list-skeleton>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={receiptRow}>
          <div className={cn(operationCell, "min-h-11")}>
            <Skeleton className="size-10 shrink-0 animate-none rounded-lg" />
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Skeleton className="h-3.5 w-32 max-w-full animate-none" />
              <Skeleton className="h-2.5 w-40 max-w-full animate-none" />
            </div>
          </div>
          <div className="grid gap-1">
            <Skeleton className="h-3 w-16 animate-none lg:hidden" />
            <Skeleton className="h-4 w-28 max-w-full animate-none" />
          </div>
          <div className="grid justify-items-end gap-1">
            <Skeleton className="h-3 w-8 animate-none lg:hidden" />
            <Skeleton className="h-4 w-20 max-w-full animate-none" />
          </div>
          <div className={actionCell}><Skeleton className="h-11 w-60 max-w-full animate-none" /></div>
        </div>
      ))}
    </div>
  );
}
