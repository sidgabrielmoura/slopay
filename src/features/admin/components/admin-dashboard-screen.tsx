"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Building2, Clock3, RotateCw, Undo2 } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlideSelect } from "@/components/ui/glide-select";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { IndicatorVolumeChart, type IndicatorMeasure } from "@/features/analytics/components/indicator-volume-chart";
import { defaultIndicatorPeriod, indicatorPeriods, indicatorPeriodSchema, periodLabels, type IndicatorPeriod } from "@/features/analytics/indicators";
import { formatDateTime } from "@/lib/dates";
import { useDevelopmentFeatures } from "@/providers/app-providers";
import { adminDashboardUnavailable, adminPendingCount, fetchAdminDashboard, type AdminDashboardOperation, type AdminDashboardReport } from "../admin-dashboard";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const statuses = {
  COMPLETED: { label: "Concluído", variant: "success" },
  PENDING: { label: "Pendente", variant: "secondary" },
  PROCESSING: { label: "Processando", variant: "secondary" },
  AWAITING_APPROVAL: { label: "Aguardando titular", variant: "warning" },
  REVIEW: { label: "Em revisão", variant: "warning" },
  FAILED: { label: "Falhou", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "secondary" },
} as const;
const kinds = { RECEIVE: "Recebimento Pix", WITHDRAW: "Saque Pix", REFUND: "Estorno Pix" };

function AdminDashboardFrame({ user, data, children }: { user: AdminIdentity; data?: AdminDashboardReport; children: ReactNode }) {
  const pending = data && "pending" in data ? data.pending : undefined;
  return (
    <AdminPanel user={user} pendingSummary={pending ? {
        pendingFinancialApprovalsCount: pending.withdrawalApprovals,
        totalUrgentTasks: pending.chargeReview + pending.withdrawalReview + pending.withdrawalApprovals,
      } : undefined}>
      {children}
    </AdminPanel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5" aria-hidden="true">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-40 animate-none rounded-none sm:h-32" />)}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <Skeleton className="h-96 animate-none rounded-xl xl:col-span-2" />
        <Skeleton className="h-96 animate-none rounded-xl" />
      </div>
      <Skeleton className="h-80 animate-none rounded-xl" />
    </div>
  );
}

export function AdminDashboardLoading({ user }: { user: AdminIdentity }) {
  return (
    <AdminDashboardFrame user={user}>
      <header className="grid gap-1">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Visão geral</h1>
        <p role="status" className="text-sm text-muted-foreground">Carregando a operação do Slopay…</p>
      </header>
      <DashboardSkeleton />
    </AdminDashboardFrame>
  );
}

export function AdminDashboardScreen({ user, initialReport }: { user: AdminIdentity; initialReport: AdminDashboardReport | null }) {
  const development = useDevelopmentFeatures();
  const [period, setPeriod] = useState<IndicatorPeriod>(defaultIndicatorPeriod);
  const [page, setPage] = useState(1);
  const [measure, setMeasure] = useState<IndicatorMeasure>("value");
  const [operation, setOperation] = useState<AdminDashboardOperation | null>(null);
  const report = useQuery({
    queryKey: ["admin-dashboard", user.id, period, page],
    queryFn: ({ signal }) => fetchAdminDashboard(period, page, signal),
    initialData: period === defaultIndicatorPeriod && page === 1 ? initialReport ?? undefined : undefined,
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && previous && "period" in previous && previous.period === period ? previous : undefined,
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: false,
  });
  const data = report.data?.environment === "sandbox" && !development ? undefined : report.data;
  const pix = data && "period" in data ? data : undefined;
  const pixUnavailable = "A consulta de operações Pix ainda não está disponível.";

  return (
    <AdminDashboardFrame user={user} data={data}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Visão geral</h1>
            {development && <Badge variant="secondary">Sandbox</Badge>}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Acompanhe os recebimentos, saques e a operação do Slopay.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <GlideSelect value={period} onChange={(value) => { setPeriod(indicatorPeriodSchema.parse(value)); setPage(1); }}
            options={indicatorPeriods.map((value) => ({ value, label: periodLabels[value] }))}
            ariaLabel="Período da visão geral" size="lg" disabled={report.isPending || (Boolean(data) && !pix)} className="min-w-0 flex-1 sm:w-48" />
          <Button type="button" variant="outline" size="icon" className="size-11 shrink-0"
            aria-label="Atualizar visão geral" disabled={report.isFetching} onClick={() => void report.refetch()}>
            {report.isFetching ? <LoadingIndicator /> : <RotateCw aria-hidden="true" />}
          </Button>
        </div>
      </header>

      <ToastNotice message={report.isError ? report.error.message || adminDashboardUnavailable : null} />
      {report.isPending && <p role="status" className="sr-only">Carregando visão geral</p>}
      <SkeletonReveal key={period} flow revealed={!report.isPending} skeleton={<DashboardSkeleton />}>
        {data || !development ? (
          <div className="grid min-w-0 gap-5">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
              <Metric label="Recebimentos confirmados" icon={<ArrowDownLeft aria-hidden="true" />}>
                {pix ? <PanelAmount cents={pix.receivedCents} /> : "—"}
                <span className="mt-2 block text-xs font-normal text-muted-foreground">{pix ? count.format(pix.receivedCount) + " recebimentos · valor bruto" : "Consulta indisponível"}</span>
              </Metric>
              <Metric label="Saques concluídos" icon={<ArrowUpRight aria-hidden="true" />}>
                {pix ? <PanelAmount cents={pix.withdrawnCents} /> : "—"}
                <span className="mt-2 block text-xs font-normal text-muted-foreground">{pix ? count.format(pix.withdrawnCount) + " saques no período" : "Consulta indisponível"}</span>
              </Metric>
              <Metric label="Operações pendentes" icon={<Clock3 aria-hidden="true" />}>
                {pix ? count.format(adminPendingCount(pix.pending)) : "—"}
                <span className="mt-2 block text-xs font-normal text-muted-foreground">Cobranças e saques em aberto</span>
              </Metric>
              <Metric label={development ? "Empresas vinculadas" : "Empresas cadastradas"} icon={<Building2 aria-hidden="true" />}>
                {pix ? count.format(pix.linkedCompaniesCount) : data ? count.format(data.companiesCount) : "—"}
                <span className="mt-2 block text-xs font-normal text-muted-foreground">{pix ? count.format(pix.companiesCount) + " empresas cadastradas" : "Total na plataforma"}</span>
              </Metric>
            </div>

            <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
              <IndicatorVolumeChart days={pix?.days ?? []} measure={measure} onMeasureChange={setMeasure} detailsHref={null}
                unavailableMessage={pix ? undefined : pixUnavailable} />
              <Card className="min-w-0">
                <CardHeader className="gap-1 p-5 pb-2">
                  <h2 className="text-balance text-lg font-semibold">Acompanhamento da operação</h2>
                  <p className="text-pretty text-sm text-muted-foreground">Pendências atuais, em todos os períodos.</p>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <dl className="divide-y divide-border text-sm">
                    <PendingItem label="Aguardando aprovação do titular" value={pix?.pending.withdrawalApprovals} />
                    <PendingItem label="Cobranças aguardando pagamento" value={pix?.pending.charges} />
                    <PendingItem label="Saques em processamento" value={pix?.pending.withdrawals} />
                    <PendingItem label="Cobranças em revisão" value={pix?.pending.chargeReview} />
                    <PendingItem label="Saques em revisão" value={pix?.pending.withdrawalReview} />
                  </dl>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 rounded-lg bg-muted px-3 py-3 text-sm">
                    <span className="text-muted-foreground">Estornos no período</span>
                    <span className="font-medium tabular-nums">{pix ? <PanelAmount cents={pix.refundedCents} /> : "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="gap-1 p-5">
                  <h2 className="text-balance text-lg font-semibold">Movimentações recentes</h2>
                  <p className="text-pretty text-sm text-muted-foreground">Operações atualizadas no período selecionado.</p>
                </CardHeader>
                {pix?.recentOperations.length ? <ul className="divide-y divide-border border-t border-border">
                  {pix.recentOperations.map((item) => {
                    const status = statuses[item.status];
                    const Icon = item.kind === "RECEIVE" ? ArrowDownLeft : item.kind === "REFUND" ? Undo2 : ArrowUpRight;
                    return (
                      <li key={`${item.kind}-${item.id}`}>
                        <button type="button" onClick={() => setOperation(item)} className="flex w-full min-w-0 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon aria-hidden="true" className="size-4" /></span>
                          <span className="grid min-w-0 flex-1 gap-1">
                            <span className="truncate text-sm font-medium">{item.company}</span>
                            <span className="truncate text-xs text-muted-foreground">{kinds[item.kind]} · {formatDateTime(item.occurredAt, "date-only")}</span>
                          </span>
                          <span className="grid shrink-0 justify-items-end gap-1.5">
                            <span className="text-sm font-medium tabular-nums"><PanelAmount cents={item.amountInCents} /></span>
                            <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul> : <EmptyState>{pix ? "As movimentações aparecerão aqui quando houver operações neste período." : pixUnavailable}</EmptyState>}
                {pix && <TablePagination {...pix.pagination} busy={report.isPlaceholderData} onPageChange={setPage} label="Paginação das movimentações" />}
              </Card>

              <Card className="min-w-0">
                <CardHeader className="gap-1 p-5 pb-2">
                  <h2 className="text-balance text-lg font-semibold">Volume por empresa</h2>
                  <p className="text-pretty text-sm text-muted-foreground">Recebimentos e saques confirmados no período.</p>
                </CardHeader>
                {pix?.companies.length ? <CardContent className="grid gap-5 px-5 pb-5 pt-3">
                  {pix.companies.map((company) => (
                    <div key={company.id} className="grid min-w-0 gap-1.5">
                      <span className="truncate text-sm font-medium">{company.name}</span>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{company.registered ? "Empresa cadastrada" : "Titular sem empresa vinculada"}</span>
                        <span className="font-medium tabular-nums text-foreground"><PanelAmount cents={company.volumeCents} /></span>
                      </div>
                    </div>
                  ))}
                </CardContent> : <EmptyState>{pix ? "O volume será exibido após as primeiras confirmações de Pix." : pixUnavailable}</EmptyState>}
              </Card>
            </div>
            <p className="text-pretty text-xs text-muted-foreground">
              {data && <>{development && pix && "Sandbox · "}Atualizado em {formatDateTime(data.generatedAt, "short")} · Horário de Brasília</>}
              {report.isFetching && <span role="status"> · Atualizando…</span>}
            </p>
          </div>
        ) : report.isError && <Card className="grid min-h-64 content-center justify-items-center gap-3 p-6 text-center">
          <h2 className="text-balance text-lg font-semibold">Visão geral indisponível</h2>
          <p className="text-pretty text-sm text-muted-foreground">Tente consultar os dados novamente.</p>
          <Button type="button" variant="outline" className="h-11" onClick={() => void report.refetch()}>Tentar novamente</Button>
        </Card>}
      </SkeletonReveal>

      <Dialog open={Boolean(operation)} onOpenChange={(open) => { if (!open) setOperation(null); }}>
        <DialogContent className="max-w-lg">
          {operation && <>
            <DialogHeader>
              <DialogTitle>{kinds[operation.kind]}</DialogTitle>
              <DialogDescription>{operation.company}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 border-b border-border pb-5">
              <p className="text-3xl font-semibold tabular-nums"><PanelAmount cents={operation.amountInCents} /></p>
              <Badge variant={statuses[operation.status].variant} className="w-fit">{statuses[operation.status].label}</Badge>
            </div>
            <dl className="grid gap-4 text-sm">
              <div className="grid gap-1"><dt className="text-muted-foreground">Descrição</dt><dd className="break-words">{operation.description}</dd></div>
              <div className="grid gap-1"><dt className="text-muted-foreground">Registrado em</dt><dd>{formatDateTime(operation.createdAt, "medium")}</dd></div>
              <div className="grid gap-1"><dt className="text-muted-foreground">Identificador Slopay</dt><dd className="break-all font-mono text-xs">{operation.id}</dd></div>
            </dl>
          </>}
        </DialogContent>
      </Dialog>
    </AdminDashboardFrame>
  );
}

function Metric({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 bg-card p-4 sm:p-5">
      <div className="mb-3 flex min-h-10 items-center justify-between gap-2 text-muted-foreground sm:min-h-0">
        <h2 className="min-w-0 flex-1 break-words text-xs font-medium sm:text-sm">{label}</h2>
        <span className="shrink-0 [&_svg]:size-4">{icon}</span>
      </div>
      <div className="break-words text-xl font-semibold tabular-nums sm:text-2xl">{children}</div>
    </section>
  );
}

function PendingItem({ label, value }: { label: string; value?: number }) {
  return <div className="flex items-start justify-between gap-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{value === undefined ? "—" : count.format(value)}</dd></div>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 pb-6 pt-3 text-pretty text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
