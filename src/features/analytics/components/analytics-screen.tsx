"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Percent,
  Terminal,
  Monitor,
  RotateCcw,
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

export function AnalyticsScreen() {
  const service = useGatewayService();
  const { hideValues } = usePreferences();
  const [period, setPeriod] = useState<string>("today");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => service.getAnalytics(period),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Empty
        title="Erro ao carregar indicadores"
        description="Não foi possível processar as estatísticas analíticas da demonstração."
        action={
          <Button onClick={() => refetch()} variant="outline">
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Indicadores Pix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas de conversão, dispersão de ticket e volume operacional por canal.
          </p>
        </div>

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

      {/* Taxa de Conversão e Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Conversão */}
        <Card className="border-border bg-card/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversão de Cobranças
            </span>
            <Badge variant="success" className="text-[10px]">
              {data.conversionRate}%
            </Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-2">
            {data.conversionRate}%
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {data.chargesPaidCount} de {data.chargesGeneratedCount} cobranças pagas
          </p>
        </Card>

        {/* Ticket Médio de Entrada */}
        <Card className="border-border bg-card/80 p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ticket Médio de Recebimento
          </span>
          <p className="text-2xl font-bold tabular-nums text-[var(--success)] mt-2">
            {formatCentsToBrl(data.inflowsAverageTicketInCents, { hideValue: hideValues })}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Min: {formatCentsToBrl(data.inflowsMinTicketInCents, { hideValue: hideValues })} · Max: {formatCentsToBrl(data.inflowsMaxTicketInCents, { hideValue: hideValues })}
          </p>
        </Card>

        {/* Ticket Médio de Saída */}
        <Card className="border-border bg-card/80 p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ticket Médio de Saque
          </span>
          <p className="text-2xl font-bold tabular-nums text-foreground mt-2">
            {formatCentsToBrl(data.outflowsAverageTicketInCents, { hideValue: hideValues })}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Min: {formatCentsToBrl(data.outflowsMinTicketInCents, { hideValue: hideValues })} · Max: {formatCentsToBrl(data.outflowsMaxTicketInCents, { hideValue: hideValues })}
          </p>
        </Card>

        {/* Volume Total Operado */}
        <Card className="border-border bg-card/80 p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Volume Total Movimentado
          </span>
          <p className="text-2xl font-bold tabular-nums text-primary mt-2">
            {formatCentsToBrl(data.inflowsVolumeInCents + data.outflowsVolumeInCents, {
              hideValue: hideValues,
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {data.inflowsCount + data.outflowsCount} transações consolidadas
          </p>
        </Card>
      </div>

      {/* Origem das Operações de Saída: API vs Painel */}
      <Card className="border-border bg-card/80">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Origem dos Saques Pix
          </CardTitle>
          <CardDescription className="text-xs">
            Distribuição de saques emitidos via API de integração versus Painel web
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="size-10 rounded-lg bg-secondary text-primary flex items-center justify-center">
                <Terminal className="size-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium">Via API</span>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {formatCentsToBrl(data.outflowsByOrigin.apiVolumeInCents, { hideValue: hideValues })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.outflowsByOrigin.apiCount} operações integradas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="size-10 rounded-lg bg-secondary text-foreground flex items-center justify-center">
                <Monitor className="size-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-medium">Via Painel Web</span>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {formatCentsToBrl(data.outflowsByOrigin.panelVolumeInCents, { hideValue: hideValues })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.outflowsByOrigin.panelCount} operações manuais
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Evolução Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Volume Financeiro por Período
            </CardTitle>
            <CardDescription className="text-xs">
              Evolução do montante transacionado (R$)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.temporalSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  dataKey="inflowsAmountInCents"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Saídas"
                  dataKey="outflowsAmountInCents"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Quantidade de Operações
            </CardTitle>
            <CardDescription className="text-xs">
              Número de transações processadas (Unidades)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.temporalSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    color: "var(--foreground)",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar name="Qtd Entradas" dataKey="inflowsCount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar name="Qtd Saídas" dataKey="outflowsCount" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
