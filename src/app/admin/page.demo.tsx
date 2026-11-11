"use client";

import React from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Building2,
  Wallet,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCentsToBrl } from "@/lib/money";

export default function AdminDashboardPage() {
  const service = useGatewayService();

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["admin_global_metrics"],
    queryFn: () => service.getGlobalOverviewMetrics(),
    refetchInterval: 15000,
  });

  const { data: pendingSummary, isLoading: loadingTasks } = useQuery({
    queryKey: ["admin_pending_tasks_summary"],
    queryFn: () => service.getPendingTasksSummary(),
    refetchInterval: 10000,
  });

  const totalVolume =
    (metrics?.inflowsAmountInCents || 0) + (metrics?.outflowsAmountInCents || 0);

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Visão Geral da Plataforma
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Consolidado operacional, liquidação instantânea Pix e esteira de credenciamento.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NextLink href="/admin/abertura-de-contas">
            <Button size="sm" className="h-9 text-xs gap-1.5 font-medium">
              <span>Fila de Abertura</span>
              {(pendingSummary?.pendingApplicationsCount ?? 0) > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4">
                  {pendingSummary?.pendingApplicationsCount}
                </Badge>
              )}
            </Button>
          </NextLink>

          <NextLink href="/admin/pendencias">
            <Button variant="outline" size="sm" className="h-9 text-xs border-border gap-1.5">
              <AlertOctagon className="size-3.5 text-destructive" />
              <span>Pendências Urgentes</span>
            </Button>
          </NextLink>
        </div>
      </div>

      {(pendingSummary?.totalUrgentTasks ?? 0) > 0 && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-destructive/20 border border-destructive/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-foreground">
                Existem {pendingSummary?.totalUrgentTasks} tarefas com atenção requerida
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pendingSummary?.pendingApplicationsCount} novas solicitações aguardando parecer e{" "}
                {pendingSummary?.pendingFinancialApprovalsCount} saques extraordinários pendentes.
              </p>
            </div>
          </div>
          <NextLink href="/admin/pendencias">
            <Button size="sm" variant="destructive" className="h-8 text-xs shrink-0 font-medium">
              Resolver Pendências
              <ArrowRight className="size-3 ml-1" />
            </Button>
          </NextLink>
        </div>
      )}

      {/* Grid de Métricas Principais (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Volume */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Volume Total (30d)
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-bold text-foreground font-mono">
              {loadingMetrics ? "Carregando..." : formatCentsToBrl(totalVolume)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Entradas + Saídas processadas
            </p>
          </CardContent>
        </Card>

        {/* Entradas Pix */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Recebimentos Pix
            </CardTitle>
            <ArrowDownLeft className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-bold text-foreground font-mono">
              {loadingMetrics
                ? "Carregando..."
                : formatCentsToBrl(metrics?.inflowsAmountInCents || 0)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {metrics?.inflowsCount || 0} cobranças liquidadas
            </p>
          </CardContent>
        </Card>

        {/* Saídas Pix */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Saques e Lotes
            </CardTitle>
            <ArrowUpRight className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-bold text-foreground font-mono">
              {loadingMetrics
                ? "Carregando..."
                : formatCentsToBrl(metrics?.outflowsAmountInCents || 0)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {metrics?.outflowsCount || 0} transferências
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Receita SloPay
            </CardTitle>
            <Receipt className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-bold text-foreground font-mono">
              {loadingMetrics
                ? "Carregando..."
                : formatCentsToBrl(metrics?.feesAmountInCents || 0)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tarifas retidas de intermediação
            </p>
          </CardContent>
        </Card>

        {/* Empresas Ativas */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Empresas Ativas
            </CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-bold text-foreground font-mono">
              {loadingMetrics ? "..." : metrics?.activeCompaniesCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Credenciadas com contrato ativo
            </p>
          </CardContent>
        </Card>

        {/* Contas Operacionais */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Contas Operacionais
            </CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-lg font-bold text-foreground font-mono">
              {loadingMetrics ? "..." : metrics?.activeAccountsCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Com chave Pix e limites ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Central Dividida: Maiores Empresas por Volume & Últimas Transações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Maiores Empresas por Volume */}
        <Card className="lg:col-span-6 bg-card border-border">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Top Empresas por Volume Pix
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Maior representatividade na liquidação global
              </CardDescription>
            </div>
            <NextLink href="/admin/empresas">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Ver todas <ArrowRight className="size-3 ml-1" />
              </Button>
            </NextLink>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {metrics?.volumeByCompany && metrics.volumeByCompany.length > 0 ? (
              metrics.volumeByCompany.map((c, idx) => {
                const pct =
                  totalVolume > 0
                    ? Math.round((c.volumeInCents / totalVolume) * 100)
                    : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[220px]">
                        {c.companyName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-foreground">
                          {formatCentsToBrl(c.volumeInCents)}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhum dado de volume disponível no momento.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Transações Recentes Globais */}
        <Card className="lg:col-span-6 bg-card border-border">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Feed de Transações em Tempo Real
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Movimentações liquidadas na infraestrutura
              </CardDescription>
            </div>
            <NextLink href="/admin/operacoes">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Explorador <ArrowRight className="size-3 ml-1" />
              </Button>
            </NextLink>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {metrics?.recentTransactions && metrics.recentTransactions.length > 0 ? (
              metrics.recentTransactions.slice(0, 6).map((tx) => {
                const isInflow = tx.direction === "IN" || tx.type === "PIX_RECEIVE";
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 px-5 flex items-center justify-between hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-7 rounded-md flex items-center justify-center ${isInflow
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                          }`}
                      >
                        {isInflow ? (
                          <ArrowDownLeft className="size-3.5" />
                        ) : (
                          <ArrowUpRight className="size-3.5" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {tx.counterpartyName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {tx.id.substring(0, 16)}...
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`text-xs font-mono font-semibold ${isInflow ? "text-primary" : "text-foreground"
                          }`}
                      >
                        {isInflow ? "+" : "-"}
                        {formatCentsToBrl(tx.amountInCents)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhuma transação recente no momento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
