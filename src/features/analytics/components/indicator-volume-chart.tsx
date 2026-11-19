"use client";

import Link from "next/link";
import { ArrowUpRight, ChartNoAxesColumn } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCentsToBrl } from "@/lib/money";
import { usePreferences } from "@/providers/preferences-provider";
import { summarizeIndicatorDays, type IndicatorDay } from "../indicators";

const counts = new Intl.NumberFormat("pt-BR");
const compactBrl = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 2,
});
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
  fontSize: "0.8125rem",
};

function shortDay(date: string) {
  return date.slice(8) + "/" + date.slice(5, 7);
}

function chartSeries(days: IndicatorDay[], countMode: boolean, groupSize: number) {
  const series = [];
  for (let index = 0; index < days.length; index += groupSize) {
    const group = days.slice(index, index + groupSize);
    const totals = summarizeIndicatorDays(group);
    const start = shortDay(group[0].date);
    const end = shortDay(group[group.length - 1].date);
    series.push({
      label: group.length > 1 ? start + "–" + end : start,
      received: countMode ? totals.receivedCount : totals.receivedCents,
      withdrawn: countMode ? totals.withdrawnCount : totals.withdrawnCents,
    });
  }
  return series;
}

export type IndicatorMeasure = "value" | "count";

export function IndicatorVolumeChart({ days, measure, onMeasureChange, detailsHref = "/movimentacoes", unavailableMessage }: {
  days: IndicatorDay[];
  measure: IndicatorMeasure;
  onMeasureChange: (measure: IndicatorMeasure) => void;
  detailsHref?: string | null;
  unavailableMessage?: string;
}) {
  const { hideValues, preferencesReady } = usePreferences();
  const hidden = hideValues || !preferencesReady;
  const countMode = hidden || measure === "count";
  const groupSize = days.length > 31 ? 7 : 1;
  const series = chartSeries(days, countMode, groupSize);

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 p-5 pb-4">
        <div className="grid gap-1">
          <h2 className="text-balance text-lg font-semibold">Movimentação Pix</h2>
          <p className="text-sm text-muted-foreground">
            {groupSize > 1 ? "Confirmações em faixas de 7 dias" : "Por dia de confirmação"}
          </p>
        </div>
        <ToggleGroup type="single" variant="ghost" aria-label="Medida do gráfico" className="rounded-lg bg-muted p-1"
          value={countMode ? "count" : "value"} onValueChange={(value) => {
            if (value === "count" || value === "value") onMeasureChange(value);
          }}>
          <ToggleGroupItem value="value" className="h-11 px-3" disabled={hidden || Boolean(unavailableMessage)}>Valores</ToggleGroupItem>
          <ToggleGroupItem value="count" className="h-11 px-3" disabled={Boolean(unavailableMessage)}>Quantidade</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-[var(--chart-1)]" aria-hidden="true" /> Entradas
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-[var(--chart-2)]" aria-hidden="true" /> Saídas
          </span>
          {hidden && <span className="sm:ml-auto">Valores ocultos</span>}
        </div>
        <div className="h-56 min-w-0 overflow-hidden sm:h-64">
          {series.some((point) => point.received > 0 || point.withdrawn > 0) ? (
            <ResponsiveContainer key={countMode ? "count" : "value"} width="100%" height="100%" minWidth={0}>
              <BarChart accessibilityLayer data={series} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
                barGap={3} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8}
                  interval="preserveStartEnd" minTickGap={16} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis width={countMode ? 38 : 69} allowDecimals={false} tickCount={5} axisLine={false} tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(value: number) => countMode ? counts.format(value) : compactBrl.format(value / 100)} />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} contentStyle={tooltipStyle}
                  itemStyle={{ color: "var(--foreground)" }} isAnimationActive={false}
                  formatter={(value, name) => [countMode ? counts.format(Number(value)) : formatCentsToBrl(Number(value)), name]} />
                <Bar dataKey="received" name="Entradas" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={25} isAnimationActive={false} />
                <Bar dataKey="withdrawn" name="Saídas" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={25} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full content-center justify-items-center gap-2 rounded-lg border border-dashed border-border px-3 text-center text-sm text-muted-foreground">
              <ChartNoAxesColumn className="size-5" aria-hidden="true" />
              {unavailableMessage ?? (countMode ? "Nenhum Pix confirmado neste período." : "Nenhum valor confirmado neste período.")}
            </div>
          )}
        </div>
        {detailsHref && <div className="flex justify-end border-t border-border pt-2">
          <Button asChild variant="ghost" className="h-11 px-2">
            <Link href={detailsHref} prefetch={false}>Ver movimentações <ArrowUpRight aria-hidden="true" /></Link>
          </Button>
        </div>}
      </CardContent>
    </Card>
  );
}
