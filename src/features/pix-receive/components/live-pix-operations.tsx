"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, QrCode, ReceiptText, ShieldCheck } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ExpenseCharts } from "@/features/expenses/components/expense-charts";
import { DashboardPixWithdraw } from "@/features/pix-withdraw/components/dashboard-pix-withdraw";
import { asaasPixWithdrawals, recentWithdrawalsKey, withdrawalOptionsKey } from "@/features/pix-withdraw/pix-withdrawal-gateway";
import { isWithdrawalFinal, withdrawalStatusLabel } from "@/features/pix-withdraw/pix-withdrawal";
import { fetchLiveTransactions } from "@/features/transactions/live-transactions";
import { statusPresentation, transactionStatusLabel, transactionTabs } from "@/features/transactions/transaction-presentation";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { asaasPixReceive } from "../pix-receive-gateway";
import { DashboardPixReceive } from "./dashboard-pix-receive";

export type PixPageView = "receive" | "withdraw";

type HistoryRow = {
  reference: string;
  description: string;
  detail?: string | null;
  createdAt: string;
  amountInCents: number;
  status: string;
  variant: BadgeProps["variant"];
};

function PixHistory({ direction, rows, loading, error, retry }: {
  direction: "IN" | "OUT";
  rows: HistoryRow[];
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{direction === "IN" ? "Cobranças recentes" : "Saques recentes"}</h2>
          <CardDescription className="mt-1">Acompanhe o status de cada operação.</CardDescription>
        </div>
        <Button asChild variant="ghost" className="h-11">
          <Link href={transactionTabs[direction].path} prefetch={false}>Ver extrato <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <ToastNotice message={error} />
        {loading ? (
          <div className="grid gap-2" aria-busy="true" aria-label="Carregando operações recentes">
            <Skeleton className="h-14 motion-reduce:animate-none" />
            <Skeleton className="h-14 motion-reduce:animate-none" />
          </div>
        ) : error && !rows.length ? (
          <Button type="button" variant="outline" className="h-11" onClick={retry}>Consultar novamente</Button>
        ) : rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.reference}>
                <Link href={`/movimentacoes/${encodeURIComponent(row.reference)}?origem=${direction}`} prefetch={false}
                  className="flex min-h-17 items-center justify-between gap-3 rounded-sm py-2 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{row.description}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.detail ? row.detail + " · " : ""}
                      <time dateTime={row.createdAt}>{formatDateTime(row.createdAt, "short")}</time>
                    </span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1 text-right text-sm font-medium tabular-nums">
                    <span><PanelAmount cents={row.amountInCents} /></span>
                    <Badge variant={row.variant}>{row.status}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<ReceiptText aria-hidden="true" />} title={direction === "IN" ? "Nenhuma cobrança recente" : "Nenhum saque recente"} />
        )}
      </CardContent>
    </Card>
  );
}

export function LivePixOperations({ merchantId, view, environment, receiveAvailable, withdrawAvailable, unavailable }: {
  merchantId: string;
  view: PixPageView;
  environment: "live" | "sandbox";
  receiveAvailable: boolean;
  withdrawAvailable: boolean;
  unavailable: boolean;
}) {
  const development = useDevelopmentFeatures();
  const router = useRouter();
  const client = useQueryClient();
  const direction = view === "withdraw" ? "OUT" : "IN";
  const available = view === "withdraw" ? withdrawAvailable : receiveAvailable;
  const useWithdrawals = view === "withdraw" && withdrawAvailable;
  const historyKey = ["pix-recent-operations", merchantId, direction] as const;
  const history = useQuery({
    queryKey: historyKey,
    queryFn: ({ signal }) => fetchLiveTransactions({ direction }, signal),
    enabled: !useWithdrawals && !unavailable,
    staleTime: 10_000,
    retry: false,
  });
  const withdrawals = useQuery({
    queryKey: recentWithdrawalsKey(merchantId),
    queryFn: ({ signal }) => asaasPixWithdrawals.recent(signal),
    enabled: useWithdrawals,
    staleTime: 10_000,
    retry: false,
  });
  const Icon = direction === "IN" ? QrCode : ShieldCheck;
  const historyQuery = useWithdrawals ? withdrawals : history;
  const records: HistoryRow[] = useWithdrawals
    ? (withdrawals.data?.withdrawals ?? []).map((withdrawal) => ({
      reference: "saque-" + withdrawal.id,
      description: withdrawal.simulated ? "Saque Pix simulado" : "Saque Pix",
      detail: withdrawal.destination,
      createdAt: withdrawal.createdAt,
      amountInCents: withdrawal.amountInCents,
      status: withdrawalStatusLabel(withdrawal),
      variant: withdrawal.state === "DONE" ? "success"
        : withdrawal.state === "REVIEW" || withdrawal.state === "BLOCKED" ? "warning"
          : withdrawal.state === "FAILED" ? "destructive" : "secondary",
    }))
    : (history.data?.data ?? []).slice(0, 6).map((transaction) => ({
      reference: transaction.reference, description: transaction.description, detail: transaction.destination,
      createdAt: transaction.createdAt, amountInCents: transaction.amountInCents,
      status: transactionStatusLabel(transaction.status, transaction.direction), variant: statusPresentation[transaction.status].variant,
    }));

  return (
    <div className="grid min-w-0 gap-8">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center gap-3 p-5 pb-4">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg",
              direction === "IN" ? "bg-success-surface text-success" : "bg-info-surface text-info")}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="grid gap-1">
              <h2 className="text-lg font-semibold tracking-tight">{direction === "IN" ? "Nova cobrança" : "Novo saque"}</h2>
              <CardDescription>
                {direction === "IN" ? "Informe o valor para gerar o QR Code." : "Informe o valor e confira o destino antes de autorizar."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {available ? direction === "IN" ? (
              <DashboardPixReceive inline environment={environment} accountId={merchantId} gateway={asaasPixReceive}
                onReceiptChange={() => {
                  void client.invalidateQueries({ queryKey: historyKey });
                  void client.invalidateQueries({ queryKey: ["pix-statement", merchantId] });
                  void client.invalidateQueries({ queryKey: withdrawalOptionsKey(merchantId) });
                }} />
            ) : (
              <DashboardPixWithdraw inline available accountId={merchantId} selectedWithdrawal={null}
                pendingWithdrawal={withdrawals.data?.withdrawals.find(({ state }) => !isWithdrawalFinal(state))}
                onCompleted={() => void client.invalidateQueries({ queryKey: ["pix-statement", merchantId] })} />
            ) : (
              <>
                <ToastNotice message={unavailable ? "Não foi possível consultar a disponibilidade do Pix." : null} />
                {unavailable ? (
                  <Button variant="outline" className="h-11" onClick={() => router.refresh()}>Consultar disponibilidade novamente</Button>
                ) : (
                  <Empty title={direction === "IN" ? "Recebimento indisponível para esta conta" : "Saque indisponível para esta conta"} />
                )}
              </>
            )}
          </CardContent>
        </Card>
        <PixHistory direction={direction} rows={records} loading={historyQuery.isLoading}
          error={historyQuery.isError ? historyQuery.error.message : undefined} retry={() => void historyQuery.refetch()} />
      </div>
      {development && <ExpenseCharts merchantId={merchantId} preview />}
    </div>
  );
}
