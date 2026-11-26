"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { ToastNotice } from "@/components/ui/toast-notice";
import { usePreferences } from "@/providers/preferences-provider";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  CheckCircle2,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const overviewPeriods = ["today", "yesterday", "week", "month"] as const;
const overviewPeriodLabels = { today: "Hoje", yesterday: "Ontem", week: "Últimos 7 dias", month: "Últimos 30 dias" };
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 0,
});
export type OverviewPeriod = (typeof overviewPeriods)[number];

type ActivityPoint = { activityInCents: number; outflowsInCents?: number };

export type OverviewMetricsView = {
  availableBalanceInCents: number | null;
  settledBalanceInCents: number | null;
  reservedBalanceInCents: number | null;
  activityCount: number;
  activityInCents: number;
  outflowsCount: number | null;
  outflowsAmountInCents: number | null;
  feesAmountInCents: number | null;
  dailyLimitInCents: number | null;
  usedDailyLimitInCents: number | null;
  pendingApprovalsCount: number | null;
  cashflowSeries: (ActivityPoint & { date: string })[];
  monthlyComparison: (ActivityPoint & { month: string })[];
  recentTransactions: {
    id: string;
    description: string;
    createdAt: string;
    amountInCents: number;
    direction?: "IN" | "OUT";
    statusLabel: string;
    statusVariant: "success" | "warning" | "secondary";
    href?: string;
    onOpen?: () => void;
  }[];
};

export function OverviewScreen({
  mode,
  metrics,
  period,
  onPeriodChange,
  onRetry,
  receiveAction,
  withdrawAction,
  showWithdrawalLinks = true,
  accountNotice,
  isLoading = false,
  readOnly = false,
}: {
  mode: "demo" | "sandbox" | "live";
  metrics: OverviewMetricsView | null;
  period: OverviewPeriod;
  onPeriodChange: (period: OverviewPeriod) => void;
  onRetry: () => void;
  receiveAction: ReactNode;
  withdrawAction?: ReactNode;
  showWithdrawalLinks?: boolean;
  accountNotice?: ReactNode;
  isLoading?: boolean;
  readOnly?: boolean;
}) {
  const preferences = usePreferences();
  const demo = mode === "demo";
  const hideValues = preferences.hideValues || !preferences.preferencesReady;
  const formatAmount = (cents: number | null, showSign = false) =>
    cents === null ? "—" : formatCentsToBrl(cents, { hideValue: hideValues, showSign });
  const displayAmount = (cents: number | null, showSign = false) =>
    hideValues && cents !== null
      ? <span aria-label="Valor oculto por motivo de privacidade">••••••</span>
      : formatAmount(cents, showSign);
  const chartAxis = (cents: number) => {
    if (hideValues) return "•••";
    return demo ? `R$ ${(cents / 100000).toFixed(0)}k` : compactCurrency.format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in-50">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <>
      {accountNotice}
      <Empty
        title="Erro ao carregar o resumo operacional"
        description={demo
          ? "Não foi possível sincronizar as métricas do painel com a demonstração."
          : "O backend não retornou o resumo da conta. Tente novamente."}
        action={
          <Button onClick={onRetry} variant="outline">
            Tentar novamente
          </Button>
        }
      />
      </>
    );
  }

  const pendingApprovals = metrics.pendingApprovalsCount ?? 0;
  const dailyLimitRemaining = metrics.dailyLimitInCents === null || metrics.usedDailyLimitInCents === null
    ? null
    : Math.max(0, metrics.dailyLimitInCents - metrics.usedDailyLimitInCents);
  const activityLabel = demo ? "Entradas" : "Valor registrado";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Visão Geral
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {demo ? "Monitoramento de saldos, fluxo de caixa e operações Pix da conta."
              : "Monitoramento de saldos e operações da conta."}
            {mode === "sandbox" && <span className="text-primary"> · Sandbox</span>}
          </p>
        </div>

        <FilterSheet value={{ period }} defaults={{ period: "today" }} active={period !== "today"} onApply={draft => onPeriodChange(draft.period)}>
          {(draft, setDraft) => <FilterSelect label="Período das métricas" value={draft.period}
            options={overviewPeriods.map(value => ({ value, label: overviewPeriodLabels[value] }))}
            onChange={value => setDraft({ period: overviewPeriods.find(option => option === value) ?? "today" })} />}
        </FilterSheet>
      </div>

      {accountNotice}

      {!readOnly && pendingApprovals > 0 && (
        <ToastNotice
          variant="warning"
          message={`${pendingApprovals} ${pendingApprovals === 1 ? "operação aguarda" : "operações aguardam"} sua aprovação.`}
          description="Existem saques corporativos retidos pelo quórum de aprovação."
          href="/aprovacoes"
          actionLabel="Revisar fila"
        />
      )}

      {/* Grid de Saldos (Atual da Conta - Diferente das Métricas do Período) */}
      {(!readOnly || metrics.settledBalanceInCents !== null) && <div className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5", !readOnly && "lg:grid-cols-3",
      )}>
        {/* Saldo Disponível */}
        {!readOnly && <Card className="border-border bg-card/80 relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo Disponível
              </span>
              <Badge variant={metrics.availableBalanceInCents === null ? "secondary" : "success"} className="text-[10px]">
                {metrics.availableBalanceInCents === null ? "Indisponível" : "Pronto para uso"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground tracking-tight">
              {displayAmount(metrics.availableBalanceInCents)}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {metrics.availableBalanceInCents === null
                ? "Disponível após a integração financeira"
                : "Disponível para saques imediatos e liquidação Pix"}
            </p>
          </CardContent>
        </Card>}

        {/* Saldo Contabilizado */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saldo Contabilizado
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground tracking-tight">
              {displayAmount(metrics.settledBalanceInCents)}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {metrics.settledBalanceInCents === null
                ? "Aguardando contabilização"
                : "Posição líquida consolidada no extrato"}
            </p>
          </CardContent>
        </Card>

        {/* Saldo Reservado */}
        <Card className={cn("border-border bg-card/80", !readOnly && "sm:col-span-2 lg:col-span-1")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {readOnly ? "Saldo reservado" : "Reservado em Aprovação"}
              </span>
              {(metrics.reservedBalanceInCents ?? 0) > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  Retido
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--warning)] tracking-tight">
              {displayAmount(metrics.reservedBalanceInCents)}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {metrics.reservedBalanceInCents === null ? "Aguardando liberação de saques"
                : metrics.reservedBalanceInCents > 0
                  ? readOnly ? "Valor comprometido em saques" : "Comprometido em saques aguardando quórum"
                  : "Nenhum valor retido no momento"}
            </p>
          </CardContent>
        </Card>
      </div>}

      {/* Atalhos Rápidos Operacionais */}
      {!readOnly && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {receiveAction}

        {showWithdrawalLinks && (withdrawAction ?? <NextLink
          href="/pix/saque-direto"
          prefetch={demo ? undefined : false}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Saque Direto</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">{demo ? "Transferência única" : "Disponibilidade de saques"}</span>
        </NextLink>)}

        {showWithdrawalLinks && <NextLink
          href="/pix/saques-em-lote"
          prefetch={demo ? undefined : false}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Layers className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Saques em Lote</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">{demo ? "Parcelas até R$ 15k" : "Disponibilidade de lotes"}</span>
        </NextLink>}

        <NextLink
          href="/movimentacoes"
          prefetch={demo ? undefined : false}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ReceiptText className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Ver Extrato</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Lançamentos</span>
        </NextLink>
      </div>}

      {/* 4 Indicadores Principais do Período */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Métricas do Período Selecionado
          </h2>
          <span className="text-xs text-muted-foreground">
            {demo ? "Tarifas Pix: 2,5% entrada · 1,5% saída" : "Valores em BRL"}
          </span>
        </div>

        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", !readOnly && "lg:grid-cols-4")}>
          <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">
              {demo ? "Entradas Pix" : mode === "sandbox" ? "Registros de teste" : "Pagamentos registrados"}
            </p>
            <p className="text-xl font-bold tabular-nums text-[var(--success)] mt-1">
              {displayAmount(metrics.activityInCents, demo)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.activityCount} {demo ? "recebimentos liquidados" : "registros no período"}
            </p>
          </Card>

          {(!readOnly || metrics.outflowsCount !== null) && <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Saídas Pix</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-1">
              {displayAmount(metrics.outflowsAmountInCents)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.outflowsCount === null ? "Saques indisponíveis" : `${metrics.outflowsCount} saques concluídos`}
            </p>
          </Card>}

          {(!readOnly || metrics.feesAmountInCents !== null) && <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Tarifas Operacionais</p>
            <p className="text-xl font-bold tabular-nums text-muted-foreground mt-1">
              {displayAmount(metrics.feesAmountInCents)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.feesAmountInCents === null ? "Tarifas indisponíveis" : "Custos Pix do período"}
            </p>
          </Card>}

          {(!readOnly || dailyLimitRemaining !== null) && <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Limite Diário Restante</p>
            <p className="text-xl font-bold tabular-nums text-primary mt-1">
              {displayAmount(dailyLimitRemaining)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {demo ? "De R$ 100.000,00 diários"
                : metrics.dailyLimitInCents === null ? "Limite indisponível" : `De ${formatAmount(metrics.dailyLimitInCents)} diários`}
            </p>
          </Card>}
        </div>
      </div>

      {/* Gráficos Operacionais (Recharts com Tokens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa Semanal */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {demo ? "Fluxo Financeiro Semanal" : "Volume Semanal de Registros"}
            </CardTitle>
            <CardDescription className="text-xs">
              {demo ? "Comparativo diário entre volume de entradas e saídas Pix" : "Valores registrados por dia nos últimos 7 dias"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.cashflowSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="outflowsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={chartAxis}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [formatAmount(Number(value)), ""]}
                />
                <Area
                  type="monotone"
                  name={activityLabel}
                  dataKey="activityInCents"
                  stroke="var(--chart-1)"
                  fillOpacity={1}
                  fill="url(#inflowsGrad)"
                  strokeWidth={2}
                  isAnimationActive={!preferences.reduceMotion}
                />
                {metrics.outflowsCount !== null && (
                  <Area
                    type="monotone"
                    name="Saídas"
                    dataKey="outflowsInCents"
                    stroke="var(--chart-2)"
                    fillOpacity={1}
                    fill="url(#outflowsGrad)"
                    strokeWidth={2}
                    isAnimationActive={!preferences.reduceMotion}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparativo de 6 Meses */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Evolução nos Últimos 6 Meses
            </CardTitle>
            <CardDescription className="text-xs">
              {demo ? "Consolidado mensal de volume transacionado" : "Volume registrado por mês"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={chartAxis}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [formatAmount(Number(value)), ""]}
                />
                <Bar
                  name={activityLabel}
                  dataKey="activityInCents"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!preferences.reduceMotion}
                />
                {metrics.outflowsCount !== null && (
                  <Bar
                    name="Saídas"
                    dataKey="outflowsInCents"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={!preferences.reduceMotion}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Últimas Transações */}
      <Card className="border-border bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Últimas Movimentações
            </CardTitle>
            <CardDescription className="text-xs">
              Atividade operacional recente na conta
            </CardDescription>
          </div>
          {!readOnly && <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-primary">
            <NextLink href="/movimentacoes" prefetch={demo ? undefined : false}>
              <span>Ver todas</span>
              <ArrowRight className="size-3.5" />
            </NextLink>
          </Button>}
        </CardHeader>
        <CardContent>
          {metrics.recentTransactions.length === 0 ? (
            <Empty
              title="Nenhuma transação recente"
              description={demo
                ? "Sua conta ainda não possui movimentações registradas neste período."
                : readOnly ? "Esta conta ainda não possui movimentações registradas."
                  : "Sua conta ainda não possui movimentações registradas."}
              action={!readOnly && (
                <Button asChild size="sm">
                  <NextLink href={demo ? "/pix/receber" : "/movimentacoes"} prefetch={demo ? undefined : false}>
                    {demo ? "Gerar Primeira Cobrança" : "Ver movimentações"}
                  </NextLink>
                </Button>
              )}
            />
          ) : (
            <div className="divide-y divide-border/60">
              {metrics.recentTransactions.map((tx) => {
                const isReceive = tx.direction === "IN";
                return (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-9 rounded-full flex items-center justify-center shrink-0 ${isReceive
                          ? "bg-[var(--success-surface)] text-[var(--success)]"
                          : "bg-secondary text-foreground"
                          }`}
                      >
                        {isReceive ? (
                          <ArrowDownLeft className="size-4" />
                        ) : tx.direction === "OUT" ? (
                          <ArrowUpRight className="size-4" />
                        ) : (
                          <ReceiptText className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {!readOnly && tx.href ? (
                            <NextLink href={tx.href} prefetch={false} className="underline-offset-4 hover:underline">
                              {tx.description}
                            </NextLink>
                            ) : !readOnly && tx.onOpen ? (
                              <button type="button" className="text-left underline-offset-4 hover:underline" onClick={tx.onOpen}>
                                {tx.description}
                              </button>
                            ) : tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDateTime(tx.createdAt, "short")} • {tx.id}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold tabular-nums ${isReceive ? "text-[var(--success)]" : "text-foreground"
                          }`}
                      >
                        {displayAmount(tx.direction === "OUT" ? -tx.amountInCents : tx.amountInCents, Boolean(tx.direction))}
                      </p>
                      <Badge variant={tx.statusVariant} className="text-[10px] mt-0.5">
                        {tx.statusLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
