"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  ShieldAlert,
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

export function OverviewScreen() {
  const service = useGatewayService();
  const { hideValues } = usePreferences();
  const [period, setPeriod] = useState<string>("today");

  const { data: metrics, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.overview(period),
    queryFn: () => service.getOverviewMetrics(period),
  });

  const { data: account } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
  });

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

  if (isError || !metrics) {
    return (
      <Empty
        title="Erro ao carregar o resumo operacional"
        description="Não foi possível sincronizar as métricas do painel com a demonstração."
        action={
          <Button onClick={() => refetch()} variant="outline">
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const isNewAccount =
    metrics.settledBalanceInCents === 0 && metrics.recentTransactions.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Visão Geral
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de saldos, fluxo de caixa e operações Pix da conta.
          </p>
        </div>

        {/* Seletor de Período das Métricas */}
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(val) => val && setPeriod(val)}
          className="bg-card border border-border p-1 rounded-lg w-fit"
        >
          <ToggleGroupItem value="today" size="sm">Hoje</ToggleGroupItem>
          <ToggleGroupItem value="yesterday" size="sm">Ontem</ToggleGroupItem>
          <ToggleGroupItem value="week" size="sm">7 dias</ToggleGroupItem>
          <ToggleGroupItem value="month" size="sm">30 dias</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Alerta de Aprovações Pendentes */}
      {metrics.pendingApprovalsCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-[#483e29] bg-[var(--warning-surface)] text-foreground">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-5 text-[var(--warning)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--warning)]">
                {metrics.pendingApprovalsCount} {metrics.pendingApprovalsCount === 1 ? "operação aguarda" : "operações aguardam"} sua aprovação
              </p>
              <p className="text-xs text-muted-foreground">
                Existem saques corporativos retidos pelo quórum de aprovação.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-[#483e29] text-foreground shrink-0">
            <NextLink href="/aprovacoes">Revisar Fila</NextLink>
          </Button>
        </div>
      )}

      {/* Grid de Saldos (Atual da Conta - Diferente das Métricas do Período) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Saldo Disponível */}
        <Card className="border-border bg-card/80 relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo Disponível
              </span>
              <Badge variant="success" className="text-[10px]">
                Pronto para uso
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground tracking-tight">
              {formatCentsToBrl(metrics.availableBalanceInCents, { hideValue: hideValues })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Disponível para saques imediatos e liquidação Pix
            </p>
          </CardContent>
        </Card>

        {/* Saldo Contabilizado */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Saldo Contabilizado
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground tracking-tight">
              {formatCentsToBrl(metrics.settledBalanceInCents, { hideValue: hideValues })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Posição líquida consolidada no extrato
            </p>
          </CardContent>
        </Card>

        {/* Saldo Reservado */}
        <Card className="border-border bg-card/80 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reservado em Aprovação
              </span>
              {metrics.reservedBalanceInCents > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  Retido
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums text-[var(--warning)] tracking-tight">
              {formatCentsToBrl(metrics.reservedBalanceInCents, { hideValue: hideValues })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {metrics.reservedBalanceInCents > 0
                ? "Comprometido em saques aguardando quórum"
                : "Nenhum valor retido no momento"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos Rápidos Operacionais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NextLink
          href="/pix/receber"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-[var(--success-surface)] text-[var(--success)] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Receber Pix</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Criar cobrança QR</span>
        </NextLink>

        <NextLink
          href="/pix/saque-direto"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Saque Direto</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Transferência única</span>
        </NextLink>

        <NextLink
          href="/pix/saques-em-lote"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Layers className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Saques em Lote</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Parcelas até R$ 15k</span>
        </NextLink>

        <NextLink
          href="/movimentacoes"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card/60 hover:bg-accent transition-all group text-center"
        >
          <div className="size-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ReceiptText className="size-5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Ver Extrato</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Lançamentos</span>
        </NextLink>
      </div>

      {/* 4 Indicadores Principais do Período */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Métricas do Período Selecionado
          </h2>
          <span className="text-xs text-muted-foreground">
            Tarifas Pix: 2,5% entrada · 1,5% saída
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Entradas Pix</p>
            <p className="text-xl font-bold tabular-nums text-[var(--success)] mt-1">
              {formatCentsToBrl(metrics.inflowsAmountInCents, { hideValue: hideValues, showSign: true })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.inflowsCount} recebimentos liquidados
            </p>
          </Card>

          <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Saídas Pix</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-1">
              {formatCentsToBrl(metrics.outflowsAmountInCents, { hideValue: hideValues })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.outflowsCount} saques concluídos
            </p>
          </Card>

          <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Tarifas Operacionais</p>
            <p className="text-xl font-bold tabular-nums text-muted-foreground mt-1">
              {formatCentsToBrl(metrics.feesAmountInCents, { hideValue: hideValues })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Custos Pix do período
            </p>
          </Card>

          <Card className="border-border bg-card/60 p-4">
            <p className="text-xs text-muted-foreground font-medium">Limite Diário Restante</p>
            <p className="text-xl font-bold tabular-nums text-primary mt-1">
              {formatCentsToBrl(
                Math.max(0, (account?.dailyLimitInCents ?? 10000000) - (account?.usedDailyLimitInCents ?? 0)),
                { hideValue: hideValues }
              )}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              De R$ 100.000,00 diários
            </p>
          </Card>
        </div>
      </div>

      {/* Gráficos Operacionais (Recharts com Tokens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa Semanal */}
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Fluxo Financeiro Semanal
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativo diário entre volume de entradas e saídas Pix
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
                  tickFormatter={(val) => `R$ ${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                    fontSize: "0.75rem",
                  }}
                  formatter={(val: any) => [
                    hideValues ? "••••••" : formatCentsToBrl(Number(val)),
                    "",
                  ]}
                />
                <Area
                  type="monotone"
                  name="Entradas"
                  dataKey="inflowsInCents"
                  stroke="var(--chart-1)"
                  fillOpacity={1}
                  fill="url(#inflowsGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Saídas"
                  dataKey="outflowsInCents"
                  stroke="var(--chart-2)"
                  fillOpacity={1}
                  fill="url(#outflowsGrad)"
                  strokeWidth={2}
                />
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
              Consolidado mensal de volume transacionado
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
                  tickFormatter={(val) => `R$ ${(val / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                    fontSize: "0.75rem",
                  }}
                  formatter={(val: any) => [
                    hideValues ? "••••••" : formatCentsToBrl(Number(val)),
                    "",
                  ]}
                />
                <Bar name="Entradas" dataKey="inflowsInCents" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar name="Saídas" dataKey="outflowsInCents" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
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
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-primary">
            <NextLink href="/movimentacoes">
              <span>Ver todas</span>
              <ArrowRight className="size-3.5" />
            </NextLink>
          </Button>
        </CardHeader>
        <CardContent>
          {isNewAccount || metrics.recentTransactions.length === 0 ? (
            <Empty
              title="Nenhuma transação recente"
              description="Sua conta ainda não possui movimentações registradas neste período."
              action={
                <Button asChild size="sm">
                  <NextLink href="/pix/receber">Gerar Primeira Cobrança</NextLink>
                </Button>
              }
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
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {tx.counterpartyName}
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
                        {formatCentsToBrl(tx.amountInCents, {
                          hideValue: hideValues,
                          showSign: isReceive,
                        })}
                      </p>
                      <Badge
                        variant={
                          tx.status === "COMPLETED"
                            ? "success"
                            : tx.status === "PENDING_APPROVAL"
                              ? "warning"
                              : "secondary"
                        }
                        className="text-[10px] mt-0.5"
                      >
                        {tx.status === "COMPLETED"
                          ? "Concluído"
                          : tx.status === "PENDING_APPROVAL"
                            ? "Aguardando"
                            : tx.status}
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
