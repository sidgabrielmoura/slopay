"use client";


import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChartNoAxesColumn, EyeOff } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { formatCentsToBrl } from "@/lib/money";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";
import { expenseKeys, fetchExpenseSummary } from "../expense-gateway";
import {
  defaultExpensePeriod, expenseCategoryPresentation, expensesUnavailable, financialControlPath,
  type ExpenseCategoryFilter, type ExpensePeriod, type ExpenseSummary,
} from "../expenses";
import { ExpenseCategoryLabel } from "./expense-category-select";

const chartGrid = "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]";
const compactMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
  fontSize: "0.8125rem",
};

function shortDay(day: string) {
  return day.slice(8) + "/" + day.slice(5, 7);
}

function chartDays(timeline: ExpenseSummary["timeline"]) {
  if (timeline.length <= 31) return timeline.map((day) => ({ label: shortDay(day.date), cents: day.spentInCents }));
  const weeks = [];
  for (let index = 0; index < timeline.length; index += 7) {
    const days = timeline.slice(index, index + 7);
    weeks.push({
      label: shortDay(days[0].date) + "–" + shortDay(days[days.length - 1].date),
      cents: days.reduce((total, day) => total + day.spentInCents, 0),
    });
  }
  return weeks;
}

function ChartPlaceholder({ hidden, children, className }: { hidden: boolean; children: string; className?: string }) {
  const Icon = hidden ? EyeOff : ChartNoAxesColumn;
  return (
    <div className={cn("grid h-full min-h-40 place-content-center justify-items-center gap-2 rounded-lg border border-dashed border-border px-4 text-center text-sm text-muted-foreground", className)}>
      <Icon aria-hidden="true" className="size-5" />
      {hidden ? "Valores ocultos" : children}
    </div>
  );
}

function SummaryTotals({ data }: { data: ExpenseSummary }) {
  return (
    <Card>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border lg:grid-cols-4">
        {([
          ["Saídas concluídas", data.outflowInCents],
          ["Total de gastos", data.spentInCents],
          ["Transferências próprias", data.transfersInCents],
          ["Tarifas registradas", data.feesInCents],
        ] as const).map(([label, value]) => (
          <div key={label} className="min-w-0 bg-card p-4 sm:p-5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 wrap-break-word text-xl font-semibold tabular-nums sm:text-2xl"><PanelAmount cents={value} /></dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function SpendingChart({ data, hidden, preview }: { data: ExpenseSummary; hidden: boolean; preview: boolean }) {
  const dateRange = formatDateTime(data.from, "date-only") + " a " + formatDateTime(data.to, "date-only");
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 p-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Resumo de gastos</h2>
          {data.environment === "sandbox" && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <CardDescription>{dateRange}{data.timeline.length > 31 ? " · por semana" : " · por dia"}</CardDescription>
        <p className="wrap-break-word text-[28px] font-semibold tracking-tight tabular-nums"><PanelAmount cents={data.spentInCents} /></p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className={preview ? "h-40 min-w-0" : "h-56 min-w-0"}>
          {hidden || data.spentInCents === 0 ? (
            <ChartPlaceholder hidden={hidden}>Nenhum gasto neste período.</ChartPlaceholder>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDays(data.timeline)} accessibilityLayer margin={{ top: 4, left: 0, right: 6, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8}
                  interval="preserveStartEnd" minTickGap={22} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                {!preview && <YAxis tickLine={false} axisLine={false} tickCount={5} width={64}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(cents: number) => compactMoney.format(cents / 100)} />}
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} contentStyle={tooltipStyle}
                  itemStyle={{ color: "var(--foreground)" }}
                  formatter={(value) => [formatCentsToBrl(Number(value)), "Gastos"]} />
                <Bar dataKey="cents" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryChart({ data, hidden, preview, selected, onSelect }: {
  data: ExpenseSummary;
  hidden: boolean;
  preview: boolean;
  selected?: ExpenseCategoryFilter | null;
  onSelect?: (category: ExpenseCategoryFilter) => void;
}) {
  const categories = data.categories.map((group) => {
    const category: ExpenseCategoryFilter = group.category ?? "UNCATEGORIZED";
    return { ...group, category, ...expenseCategoryPresentation[category], fill: expenseCategoryPresentation[category].color };
  });
  const displayedCategories = preview ? categories.slice(0, 3) : categories;
  const remainingCategories = categories.length - displayedCategories.length;
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-1 p-5 pb-4">
        <h2 className="text-lg font-semibold tracking-tight">Saídas por categoria</h2>
        <CardDescription>{data.count} {data.count === 1 ? "saída concluída" : "saídas concluídas"}</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {categories.length === 0 ? (
          <ChartPlaceholder hidden={hidden}>As saídas confirmadas aparecerão aqui.</ChartPlaceholder>
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(112px,0.8fr)_minmax(0,1.2fr)]">
            <div className={cn("relative mx-auto aspect-square w-full min-w-0", preview ? "max-w-28" : "max-w-44")}>
              {hidden ? (
                <ChartPlaceholder hidden className={preview ? "min-h-0 px-2 text-xs" : undefined}>Valores ocultos</ChartPlaceholder>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart accessibilityLayer={false}>
                      <Pie
                        data={categories}
                        dataKey="amountInCents"
                        nameKey="label"
                        innerRadius="71%"
                        outerRadius="96%"
                        stroke="var(--card)"
                        strokeWidth={2}
                        cornerRadius={3}
                        isAnimationActive={false}
                        className={onSelect ? "cursor-pointer" : undefined}
                        onClick={onSelect ? (slice) => onSelect(slice.payload.category) : undefined}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-xs font-semibold tabular-nums sm:text-sm" aria-hidden="true">
                      {compactMoney.format(data.outflowInCents / 100)}
                    </span>
                    <span className="sr-only"><PanelAmount cents={data.outflowInCents} /></span>
                  </div>
                </>
              )}
            </div>
            <ul className="min-w-0 divide-y divide-border" aria-label={preview ? "Principais categorias das saídas" : "Categorias das saídas"}>
              {displayedCategories.map(({ category, amountInCents }) => {
                const active = selected === category;
                const content = (
                  <>
                    <ExpenseCategoryLabel category={category} />
                    <span className="flex shrink-0 flex-col items-end text-right text-xs tabular-nums">
                      <span className="font-medium"><PanelAmount cents={amountInCents} /></span>
                      {!hidden && <span className="text-muted-foreground">{percent.format(amountInCents / data.outflowInCents)}</span>}
                    </span>
                  </>
                );
                const classes = cn("flex w-full items-center justify-between gap-2 text-left text-sm", preview ? "min-h-9" : "min-h-11");
                return (
                  <li key={category}>
                    {onSelect ? (
                      <button type="button" aria-pressed={active} onClick={() => onSelect(category)}
                        className={cn(classes, "rounded-sm px-1 focus-visible:outline-2 focus-visible:outline-ring hover:bg-muted", active && "font-semibold text-primary")}>
                        {content}
                      </button>
                    ) : <div className={classes}>{content}</div>}
                  </li>
                );
              })}
              {remainingCategories > 0 && <li className="pt-2 text-xs text-muted-foreground">
                Mais {remainingCategories} {remainingCategories === 1 ? "categoria no relatório" : "categorias no relatório"}
              </li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpenseCharts({ merchantId, period = defaultExpensePeriod, preview = false, selected, onSelect }: {
  merchantId: string;
  period?: ExpensePeriod;
  preview?: boolean;
  selected?: ExpenseCategoryFilter | null;
  onSelect?: (category: ExpenseCategoryFilter) => void;
}) {
  const { hideValues, preferencesReady } = usePreferences();
  const hidden = hideValues || !preferencesReady;
  const report = useQuery({
    queryKey: expenseKeys.summary(merchantId, period),
    queryFn: ({ signal }) => fetchExpenseSummary(period, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return (
    <section aria-label={preview ? "Prévia do controle financeiro" : "Resumo e categorias"} className="grid min-w-0 gap-4">
      {preview && (
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Controle financeiro</h2>
            <p className="text-sm text-muted-foreground">Saídas concluídas neste mês</p>
          </div>
          <Button variant="outline" className="h-11" asChild>
            <Link href={financialControlPath} prefetch={false}>Ver tudo <ArrowUpRight aria-hidden="true" /></Link>
          </Button>
        </header>
      )}
      <ToastNotice message={report.isError ? report.error.message || expensesUnavailable : null} />
      <SkeletonReveal key={period} flow revealed={!report.isPending}
        skeleton={(
          <>
            {!preview && <Skeleton className="mb-4 h-25 animate-none" />}
            <div className={chartGrid}>
              <Skeleton className={cn("animate-none", preview ? "h-44" : "h-62")} />
              <Skeleton className={cn("animate-none", preview ? "h-44" : "h-62")} />
            </div>
          </>
        )}>
        {report.data ? (
          <div className="grid min-w-0 gap-4">
            {!preview && <SummaryTotals data={report.data} />}
            <div className={chartGrid}>
              <SpendingChart data={report.data} hidden={hidden} preview={preview} />
              <CategoryChart data={report.data} hidden={hidden} preview={preview} selected={selected} onSelect={onSelect} />
            </div>
          </div>
        ) : report.isError ? (
          <Card className="grid min-h-48 place-items-center p-5">
            <Button variant="outline" className="h-11" onClick={() => void report.refetch()} disabled={report.isFetching}>
              Recarregar gráficos
            </Button>
          </Card>
        ) : <p role="status" className="sr-only">Carregando controle financeiro…</p>}
      </SkeletonReveal>
    </section>
  );
}
