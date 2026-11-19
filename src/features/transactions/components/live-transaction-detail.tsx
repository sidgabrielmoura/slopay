import Link from "next/link";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CircleCheck, Clock3, FileCheck2 } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { canSharePixReceipt } from "@/features/receipts/pix-receipt-share";
import { ShareReceiptButton } from "@/features/receipts/share-receipt-button";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { LiveTransactionDetail as TransactionDetail } from "../live-transactions";
import { statusPresentation, transactionName, transactionStatusLabel } from "../transaction-presentation";

export function LiveTransactionDetail({ data, backTo, share = true }: { data: TransactionDetail; backTo: string; share?: boolean }) {
  const { environment, operation } = data;
  const incoming = operation.direction === "IN";
  const isRefund = operation.reference.startsWith("estorno-");
  const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight;
  const title = isRefund ? "Estorno Pix" : operation.simulated ? "Saque Pix simulado" : transactionName(operation.direction);
  const outcome = operation.status === "COMPLETED" ? "success" : operation.status === "FAILED" ? "failure" : null;
  const settlement = operation.settledAt ?? operation.settledDate;
  const accountTotal = incoming || isRefund ? operation.netInCents : (
    operation.feeInCents === null ? null : operation.amountInCents + operation.feeInCents
  );
  const details = [
    incoming || isRefund ? { label: "Descrição", value: operation.description } : { label: "Destino Pix", value: operation.destination },
    { label: "Referência Slopay", value: operation.id, identifier: true },
    { label: "Referência de processamento", value: operation.providerId, identifier: true },
  ];
  const events = [
    { label: isRefund ? "Estorno registrado" : incoming ? "Cobrança criada" : "Saque solicitado", date: operation.createdAt, icon: Clock3 },
    { label: incoming ? "Pagamento liquidado" : "Saque efetivado", date: settlement, dateOnly: !operation.settledAt, icon: CircleCheck },
    { label: "Confirmação registrada", date: operation.recordedAt, icon: FileCheck2 },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start gap-3 border-b border-border pb-5 sm:pb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-11 px-2 sm:h-9">
          <Link href={backTo} prefetch={false}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao extrato
          </Link>
        </Button>
        <header className="flex w-full flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {outcome ? <LoadingConfirmation size={48} outcome={outcome} /> : (
              <span aria-hidden="true" className={cn(
                "grid size-12 shrink-0 place-items-center rounded-xl",
                incoming ? "bg-success-surface text-success" : "bg-secondary text-foreground",
              )}>
                <DirectionIcon className="size-6" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-balance text-2xl font-semibold sm:text-3xl">{title}</h1>
              {environment === "sandbox" && <p className="text-sm text-muted-foreground">Sandbox</p>}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <Badge variant={statusPresentation[operation.status].variant} className="gap-2 px-3 py-1">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
              {isRefund ? "Estornado" : transactionStatusLabel(operation.status, operation.direction)}
            </Badge>
            {share && canSharePixReceipt(environment, operation) && (
              <ShareReceiptButton key={operation.reference} reference={operation.reference} />
            )}
          </div>
        </header>
      </div>

      <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card role="region" aria-labelledby="transaction-financial-heading" className="overflow-hidden">
          <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
            <h2 id="transaction-financial-heading" className="text-balance text-lg font-semibold">Resumo financeiro</h2>
          </CardHeader>
          <CardContent className="px-5 pb-0 sm:px-6">
            <dl>
              <div className="pb-5">
                <dt className="text-sm text-muted-foreground">Valor principal</dt>
                <dd className="mt-1 wrap-anywhere text-3xl font-semibold tabular-nums sm:text-4xl">
                  <PanelAmount cents={operation.amountInCents} />
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border py-3.5">
                <dt className="text-sm text-muted-foreground">Tarifa Pix</dt>
                <dd className="wrap-anywhere text-sm font-medium tabular-nums">
                  {operation.feeInCents === null ? <span className="text-muted-foreground">Indisponível</span> : <PanelAmount cents={operation.feeInCents} />}
                </dd>
              </div>
              {Boolean(operation.refundedInCents) && <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t py-3.5">
                <dt className="text-sm text-muted-foreground">Valor estornado</dt>
                <dd className="text-sm font-medium tabular-nums"><PanelAmount cents={operation.refundedInCents ?? 0} /></dd>
              </div>}
              {operation.refundPending && <div className="flex flex-wrap items-baseline justify-between gap-2 border-t py-3 text-sm">
                <dt className="text-muted-foreground">Estorno</dt><dd>Em processamento</dd>
              </div>}
            </dl>
          </CardContent>
          <CardFooter className="border-t border-border bg-muted/40 px-5 py-4 sm:px-6">
            <dl className="w-full">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <dt className="text-sm font-medium">{incoming ? "Total creditado líquido" : "Total debitado da conta"}</dt>
                <dd className={cn(
                  "wrap-anywhere text-lg font-semibold tabular-nums",
                  incoming && accountTotal !== null && "text-success",
                )}>
                  {accountTotal === null ? <span className="text-sm font-normal text-muted-foreground">Indisponível</span> : <PanelAmount cents={accountTotal} />}
                </dd>
              </div>
            </dl>
          </CardFooter>
        </Card>

        <Card role="region" aria-labelledby="transaction-history-heading" className="xl:col-start-2 xl:row-span-2">
          <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-5">
            <h2 id="transaction-history-heading" className="text-balance text-lg font-semibold">Histórico da operação</h2>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <ol role="list" className="list-none">
              {events.map(({ label, date, dateOnly, icon: EventIcon }) => date && (
                <li key={label} className="relative flex items-start gap-3 pb-5 last:pb-0 before:absolute before:top-8 before:bottom-0 before:left-4 before:w-px before:bg-border last:before:hidden">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                    <EventIcon className="size-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-medium">{label}</p>
                    <time dateTime={date} className="mt-0.5 block text-sm text-muted-foreground tabular-nums">
                      {formatDateTime(date, dateOnly ? "date-only" : "medium")}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card role="region" aria-labelledby="transaction-data-heading" className="xl:col-start-1">
          <CardHeader className="p-5 pb-2 sm:p-6 sm:pb-2">
            <h2 id="transaction-data-heading" className="text-balance text-lg font-semibold">Dados da movimentação</h2>
          </CardHeader>
          <CardContent className="px-5 pb-2.5 sm:px-6">
            <dl className="divide-y divide-border text-sm">
              {details.map(({ label, value, identifier }) => value && (
                <div key={label} className="grid gap-1 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className={cn("min-w-0 wrap-anywhere font-medium", identifier && "font-mono")}>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
