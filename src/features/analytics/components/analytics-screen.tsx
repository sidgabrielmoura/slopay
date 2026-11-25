"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import {
  defaultIndicatorPeriod, indicatorPeriods, indicatorPeriodSchema, indicatorsUnavailable, periodLabels,
  summarizeIndicatorDays, type IndicatorPeriod, type IndicatorReport,
} from "../indicators";
import { IndicatorVolumeChart, type IndicatorMeasure } from "./indicator-volume-chart";

const statsGrid = "grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border lg:grid-cols-4";
const chartsGrid = "grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]";
const counts = new Intl.NumberFormat("pt-BR");
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const chargeStates = [
  { key: "paid", label: "Pagas", color: "var(--success)" },
  { key: "open", label: "Em aberto", color: "var(--warning)" },
  { key: "closed", label: "Encerradas", color: "var(--muted-foreground)" },
] as const;

export function AnalyticsScreen({ scope, load }: {
  scope: string;
  load: (period: IndicatorPeriod, signal: AbortSignal) => Promise<IndicatorReport>;
}) {
  const [period, setPeriod] = useState<IndicatorPeriod>(defaultIndicatorPeriod);
  const [measure, setMeasure] = useState<IndicatorMeasure>("value");
  const report = useQuery({
    queryKey: queryKeys.analytics(scope, period),
    queryFn: ({ signal }) => load(period, signal),
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const data = report.data;
  const environment = data?.environment === "sandbox" ? "Sandbox" : data?.environment === "demo" ? "Demonstração" : null;

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Indicadores Pix</h1>
            {environment && <Badge variant="secondary">{environment}</Badge>}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Acompanhe recebimentos, saques e a conversão das suas cobranças.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Select value={period} onValueChange={(value) => setPeriod(indicatorPeriodSchema.parse(value))}>
            <SelectTrigger aria-label="Período dos indicadores" className="h-11 min-w-0 flex-1 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {indicatorPeriods.map((option) => <SelectItem key={option} value={option}>{periodLabels[option]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" aria-label="Atualizar indicadores" className="size-11"
            onClick={() => void report.refetch()} disabled={report.isFetching}>
            <RotateCw aria-hidden="true" />
          </Button>
        </div>
      </header>

      <ToastNotice message={report.isError ? report.error.message || indicatorsUnavailable : null} />
      {report.isLoading && <p role="status" className="sr-only">Carregando indicadores</p>}
      <SkeletonReveal key={period} flow revealed={!report.isLoading} skeleton={<IndicatorsSkeleton />}>
        {data ? <IndicatorData report={data} measure={measure} onMeasureChange={setMeasure} /> : report.isError && (
          <Card className="grid min-h-52 content-center justify-items-center gap-3 p-5 text-center">
            <h2 className="text-balance text-base font-semibold">Indicadores indisponíveis</h2>
            <Button type="button" variant="outline" className="h-11" disabled={report.isFetching}
              onClick={() => void report.refetch()}>Tentar novamente</Button>
          </Card>
        )}
      </SkeletonReveal>
    </div>
  );
}

function IndicatorsSkeleton() {
  return (
    <>
      <Skeleton className="mb-3 h-4 w-44 animate-none" />
      <Skeleton className="mb-4 h-44 animate-none lg:h-25" />
      <div className={chartsGrid}>
        <Skeleton className="h-103 animate-none" />
        <Skeleton className="h-80 animate-none xl:h-103" />
      </div>
    </>
  );
}

function IndicatorData({ report, measure, onMeasureChange }: {
  report: IndicatorReport;
  measure: IndicatorMeasure;
  onMeasureChange: (measure: IndicatorMeasure) => void;
}) {
  const totals = summarizeIndicatorDays(report.days);
  const { paid, open, closed } = report.charges;
  const issued = paid + open + closed;
  const metrics = [
    {
      label: "Recebido líquido", value: <PanelAmount cents={totals.receivedCents} />,
      detail: counts.format(totals.receivedCount) + (totals.receivedCount === 1 ? " recebimento" : " recebimentos"),
    },
    {
      label: "Enviado em saques", value: <PanelAmount cents={totals.withdrawnCents} />,
      detail: counts.format(totals.withdrawnCount) + (totals.withdrawnCount === 1 ? " saque" : " saques"),
    },
    { label: "Pix confirmados", value: counts.format(totals.receivedCount + totals.withdrawnCount), detail: "Entradas e saídas" },
    {
      label: "Conversão de cobranças", value: issued ? percent.format(paid / issued) : "—",
      detail: issued ? counts.format(paid) + " de " + counts.format(issued) + " pagas" : "Nenhuma cobrança emitida",
    },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatDateTime(report.days[0].date, "date-only")} a {formatDateTime(report.days[report.days.length - 1].date, "date-only")}
      </p>
      <Card>
        <dl aria-label="Resumo do período" className={statsGrid}>
          {metrics.map(({ label, value, detail }) => (
            <div key={label} className="min-w-0 bg-card p-4 sm:p-5">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 wrap-break-word text-xl font-semibold tabular-nums sm:text-2xl">{value}</dd>
              <dd className="mt-1 text-xs text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className={chartsGrid}>
        <IndicatorVolumeChart days={report.days} measure={measure} onMeasureChange={onMeasureChange} />
        <Card className="min-w-0">
          <CardHeader className="space-y-1 p-5 pb-4">
            <h2 className="text-balance text-lg font-semibold">Cobranças emitidas</h2>
            <p className="text-pretty text-sm text-muted-foreground">Situação atual das cobranças criadas no período.</p>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 pb-5">
            {issued > 0 && (
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                {chargeStates.filter(({ key }) => report.charges[key] > 0).map(({ key, color }) => (
                  <span key={key} style={{ flex: report.charges[key], backgroundColor: color }} />
                ))}
              </div>
            )}
            <dl className="divide-y divide-border">
              {chargeStates.map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <dt className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-2 rounded-sm" style={{ backgroundColor: color }} />
                    {label}
                  </dt>
                  <dd className="font-medium tabular-nums">{counts.format(report.charges[key])}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-2 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">Valor médio por Pix</h3>
              <dl className="grid grid-cols-2 gap-3">
                {([
                  ["Recebido líquido", totals.receivedCents, totals.receivedCount],
                  ["Enviado em saques", totals.withdrawnCents, totals.withdrawnCount],
                ] as const).map(([label, value, count]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 wrap-break-word text-sm font-medium tabular-nums">
                      {count ? <PanelAmount cents={Math.round(value / count)} /> : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
