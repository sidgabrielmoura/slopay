"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { adminDatePeriod, adminDatePeriodLabels } from "../admin-date-period";
import { retryAdminRead } from "../admin-query";
import {
  adminBatchHref, adminBatchQuery, adminBatchQueryFrom, adminBatchSearch, adminBatchStatuses, adminWithdrawalBatches,
  type AdminWithdrawalBatch, type AdminWithdrawalBatchesReport, type AdminWithdrawalBatchQuery,
} from "../admin-withdrawal-batches";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const number = new Intl.NumberFormat("pt-BR");
const initialQuery = adminBatchQuery.parse({});
const statuses = adminBatchQuery.shape.status.unwrap().options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : adminBatchStatuses[value].label,
}));
const periods = adminDatePeriod.options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));

export function AdminBatchBadge({ state }: { state: AdminWithdrawalBatch["state"] }) {
  const { label, variant } = adminBatchStatuses[state];
  return <Badge variant={variant} className="max-w-full whitespace-normal">{label}</Badge>;
}

function BatchFilters({ query, onChange }: { query: AdminWithdrawalBatchQuery; onChange: (next: AdminWithdrawalBatchQuery) => void }) {
  const [search, setSearch] = useState(query.search);
  const filtered = query.search || query.companyId || query.accountId || query.status !== "ALL" || query.period !== initialQuery.period;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = adminBatchSearch.safeParse(search);
    if (!value.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setSearch(value.data);
    onChange({ ...query, search: value.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar lotes de saída" className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5" onSubmit={submit}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="admin-batch-search" className="text-sm font-medium">Buscar lote</label>
          <div className="flex min-w-0 gap-2">
            <Input id="admin-batch-search" type="search" className="h-11 min-w-0" placeholder="Lote, transferência, empresa ou CNPJ"
              maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar lote"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-batch-status" className="text-sm font-medium">Situação</span>
          <GlideSelect aria-labelledby="admin-batch-status" options={statuses} value={query.status} size="lg" menuWidth={228}
            onChange={(value) => onChange({ ...query, status: adminBatchQuery.shape.status.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-batch-period" className="text-sm font-medium">Período de criação</span>
          <GlideSelect aria-labelledby="admin-batch-period" options={periods} value={query.period} size="lg"
            onChange={(value) => onChange({ ...query, period: adminDatePeriod.parse(value), page: 1 })} />
        </div>
      </div>
      {filtered && (
        <div className="flex min-w-0 flex-wrap gap-2">
          {query.companyId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onChange({ ...query, companyId: undefined, page: 1 })}>
            Remover filtro de empresa <X aria-hidden="true" />
          </Button>}
          {query.accountId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onChange({ ...query, accountId: undefined, page: 1 })}>
            Remover filtro de conta <X aria-hidden="true" />
          </Button>}
          <Button type="button" variant="ghost" size="sm" className="h-11" onClick={() => { setSearch(""); onChange(initialQuery); }}>Limpar filtros</Button>
        </div>
      )}
    </form>
  );
}

function BatchSummary({ data, loading }: { data?: AdminWithdrawalBatchesReport; loading: boolean }) {
  const metrics = data && [
    { title: "Lotes encontrados", value: number.format(data.pagination.total), caption: `${number.format(data.summary.transferCount)} transferências` },
    { title: "Valor solicitado", value: <PanelAmount cents={data.summary.amountInCents} />, caption: "Todas as transferências filtradas" },
    { title: "Valor liquidado", value: <PanelAmount cents={data.summary.completedAmountInCents} />,
      caption: `${number.format(data.summary.completedCount)} ${data.summary.completedCount === 1 ? "Pix liquidado" : "Pix liquidados"}` },
    { title: "Tarifas registradas", value: data.summary.recordedFeesInCents === null ? "—" : <PanelAmount cents={data.summary.recordedFeesInCents} />,
      caption: `${number.format(data.summary.recordedFeeCount)} Pix com tarifa registrada` },
  ];
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>{[1, 2, 3, 4].map((cell) => (
        <div key={cell} className="grid min-w-0 content-center gap-2.5 bg-card p-4 sm:p-5">
          <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-4/5 animate-none" /><Skeleton className="h-3 w-1/2 animate-none" />
        </div>
      ))}</div>
    }>
      {metrics && <dl aria-label="Resumo dos lotes filtrados" className={grid}>{metrics.map((metric) => (
        <div key={metric.title} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
          <dt className="text-sm text-muted-foreground">{metric.title}</dt>
          <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">{metric.value}</dd>
          <dd className="text-xs tabular-nums text-muted-foreground">{metric.caption}</dd>
        </div>
      ))}</dl>}
    </SkeletonReveal>
  );
}

function BatchName({ batch }: { batch: AdminWithdrawalBatch }) {
  return <div className="min-w-0 space-y-0.5">
    <p className="truncate font-medium" title={batch.title ?? undefined}>{batch.title || "Lote Pix"}</p>
    <p className="font-mono text-xs text-muted-foreground" title={batch.id}>{batch.id.slice(0, 8)}</p>
  </div>;
}

function BatchLink({ batch, query }: { batch: AdminWithdrawalBatch; query: AdminWithdrawalBatchQuery }) {
  return <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground">
    <Link href={adminBatchHref(query, batch.id)} prefetch={false} aria-label={`Ver lote ${batch.title || batch.id.slice(0, 8)}`}>
      <ChevronRight aria-hidden="true" />
    </Link>
  </Button>;
}

function BatchRows({ batches, query }: { batches: AdminWithdrawalBatch[]; query: AdminWithdrawalBatchQuery }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Lotes de saída" className="table-fixed">
          <colgroup>
            <col className="w-[20%]" /><col className="w-[19%]" /><col className="w-[12%]" />
            <col className="w-[11%]" /><col className="w-[18%]" /><col className="w-[14%]" /><col className="w-[6%]" />
          </colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Lote</TableHead><TableHead scope="col">Empresa</TableHead><TableHead scope="col">Criação</TableHead>
              <TableHead scope="col">Execução</TableHead><TableHead scope="col">Situação</TableHead>
              <TableHead scope="col" className="text-right">Valor do lote</TableHead><TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="py-2.5"><BatchName batch={batch} /></TableCell>
              <TableCell className="py-2.5">
                <p className="truncate font-medium" title={batch.company}>{batch.company}</p>
                <p className="truncate text-xs text-muted-foreground">Carteira · {batch.walletSuffix}</p>
              </TableCell>
              <TableCell className="py-2.5">
                <time dateTime={batch.createdAt} className="block text-xs tabular-nums text-muted-foreground">{formatDateTime(batch.createdAt, "date-only")}</time>
              </TableCell>
              <TableCell className="py-2.5 tabular-nums">
                <p className="font-medium">{batch.completedCount} de {batch.count}</p><p className="text-xs text-muted-foreground">liquidados</p>
              </TableCell>
              <TableCell className="py-2.5">
                <AdminBatchBadge state={batch.state} />
                {batch.simulated && <p className="mt-0.5 text-xs text-muted-foreground">Simulação</p>}
              </TableCell>
              <TableCell className="wrap-anywhere py-2.5 text-right font-semibold tabular-nums"><PanelAmount cents={batch.amountInCents} /></TableCell>
              <TableCell className="px-1 py-2 text-center"><BatchLink query={query} batch={batch} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Lotes de saída" className="min-w-0 divide-y divide-border xl:hidden">{batches.map((batch) => (
        <li key={batch.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-1"><BatchName batch={batch} /><BatchLink query={query} batch={batch} /></div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-start gap-2">
            <p className="truncate text-sm text-muted-foreground" title={batch.company}>{batch.company}</p>
            <p className="wrap-anywhere text-right text-sm font-semibold tabular-nums"><PanelAmount cents={batch.amountInCents} /></p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <AdminBatchBadge state={batch.state} />{batch.simulated && <span className="text-xs text-muted-foreground">Simulação</span>}
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">{batch.completedCount} de {batch.count} liquidados</p>
          </div>
        </li>
      ))}</ul>
    </>
  );
}

export function AdminWithdrawalBatchesScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const query = adminBatchQueryFrom(useSearchParams());
  const filters = adminBatchHref({ ...query, page: 1 });
  const result = useQuery({
    queryKey: ["admin-withdrawal-batches", user.id, filters, query.page],
    queryFn: ({ signal }) => adminWithdrawalBatches.list(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === filters ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = denied ? undefined : result.data;

  function navigate(next: AdminWithdrawalBatchQuery) {
    window.history.replaceState(null, "", adminBatchHref(next));
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Lotes de saída</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Acompanhe os saques em lote das empresas e a liquidação de cada Pix.</p>
      </header>
      {(result.isLoading || data) && <BatchSummary data={data} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="admin-batch-history">
        <header className="px-4 py-4 sm:px-5">
          <h2 id="admin-batch-history" className="text-balance text-lg font-semibold">Histórico de lotes</h2>
        </header>
        <BatchFilters key={query.search} query={query} onChange={navigate} />
        {result.isLoading && <p role="status" className="sr-only">Carregando lotes de saída</p>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((cell) => (
            <div key={cell} className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="ml-auto h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {data ? <>
            {data.items.length ? <BatchRows batches={data.items} query={{ ...query, page: data.pagination.page }} /> : (
              <div className="grid min-h-48 content-center justify-items-center gap-3 px-5 py-6 text-center">
                <h3 className="text-balance text-base font-semibold">Nenhum lote para os filtros selecionados</h3>
                {query.period !== "ALL"
                  ? <Button type="button" variant="outline" className="h-11" onClick={() => navigate({ ...query, period: "ALL", page: 1 })}>Consultar todo o período</Button>
                  : <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Atualizar consulta</Button>}
              </div>
            )}
            <TablePagination {...data.pagination} label="Paginação de lotes de saída" busy={result.isPlaceholderData}
              onPageChange={(page) => navigate({ ...query, page })} />
          </> : result.isError && (
            <div className="grid min-h-48 content-center justify-items-center gap-3 px-5 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Não foi possível consultar os lotes</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
      </Card>
    </AdminPanel>
  );
}
