"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  adminChargeId, adminChargeParams, adminChargeQuery, adminChargeQueryFrom, adminChargeSearch, adminChargeStatusLabels,
  adminPixCharges, adminPixChargesPath, type AdminChargeQuery, type AdminChargeRow, type AdminChargesReport,
} from "../admin-pix-charges";
import { retryAdminRead } from "../admin-query";
import { AdminChargeBadge, AdminPixChargeDialog } from "./admin-pix-charge-detail";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const initialQuery = adminChargeQuery.parse({});
const statuses = adminChargeQuery.shape.status.unwrap().options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : adminChargeStatusLabels[value],
}));
const periods = adminDatePeriod.options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));

function ChargeFilters({ query, onChange }: { query: AdminChargeQuery; onChange: (next: AdminChargeQuery) => void }) {
  const [search, setSearch] = useState(query.search);
  const canClear = query.search || query.status !== "ALL" || query.period !== initialQuery.period || query.companyId || query.accountId;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = adminChargeSearch.safeParse(search);
    if (!value.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setSearch(value.data);
    onChange({ ...query, page: 1, search: value.data });
  }

  return (
    <form role="search" aria-label="Filtrar cobranças Pix" className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5" onSubmit={submit}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="admin-charge-search" className="text-sm font-medium">Buscar cobrança</label>
          <div className="flex min-w-0 gap-2">
            <Input id="admin-charge-search" type="search" className="h-11 min-w-0" placeholder="ID, descrição, empresa ou CNPJ"
              maxLength={120} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar cobrança">
              <Search aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-charge-status" className="text-sm font-medium">Situação</span>
          <GlideSelect aria-labelledby="admin-charge-status" size="lg" options={statuses} value={query.status} menuWidth={210}
            onChange={(value) => onChange({ ...query, page: 1, status: adminChargeQuery.shape.status.parse(value) })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-charge-period" className="text-sm font-medium">Período de criação</span>
          <GlideSelect aria-labelledby="admin-charge-period" size="lg" options={periods} value={query.period}
            onChange={(value) => onChange({ ...query, page: 1, period: adminDatePeriod.parse(value) })} />
        </div>
      </div>
      {canClear && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {query.companyId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onChange({ ...query, page: 1, companyId: undefined })}>
            Remover filtro de empresa <X aria-hidden="true" />
          </Button>}
          {query.accountId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onChange({ ...query, page: 1, accountId: undefined })}>
            Remover filtro de conta <X aria-hidden="true" />
          </Button>}
          <Button type="button" variant="ghost" size="sm" className="h-11" onClick={() => { setSearch(""); onChange(initialQuery); }}>Limpar filtros</Button>
        </div>
      )}
    </form>
  );
}

function ChargeSummary({ data, loading }: { data?: AdminChargesReport; loading: boolean }) {
  const metrics = data && [
    { label: "Valor registrado", amount: data.summary.registeredCents, count: data.pagination.total },
    { label: "Valor em aberto", amount: data.summary.outstandingCents, count: data.summary.outstandingCount },
    { label: "Valor recebido bruto", amount: data.summary.receivedCents, count: data.summary.receivedCount },
    { label: "Valor em revisão", amount: data.summary.reviewCents, count: data.summary.reviewCount },
  ];
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>
        {[1, 2, 3, 4].map((slot) => (
          <div key={slot} className="grid min-w-0 content-center gap-2.5 bg-card p-4 sm:p-5">
            <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-4/5 animate-none" /><Skeleton className="h-3 w-1/2 animate-none" />
          </div>
        ))}
      </div>
    }>
      {metrics && (
        <dl className={grid} aria-label="Totais das cobranças filtradas">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
              <dt className="text-sm text-muted-foreground">{metric.label}</dt>
              <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl"><PanelAmount cents={metric.amount} /></dd>
              <dd className="text-xs tabular-nums text-muted-foreground">{count.format(metric.count)} {metric.count === 1 ? "cobrança" : "cobranças"}</dd>
            </div>
          ))}
        </dl>
      )}
    </SkeletonReveal>
  );
}

type OpenCharge = (id: string) => void;

function ChargeName({ item }: { item: AdminChargeRow }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium" title={item.description ?? undefined}>{item.description ?? "Cobrança Pix"}</p>
      <p className="font-mono text-xs text-muted-foreground" title={item.id}>{item.id.slice(0, 8)}</p>
    </div>
  );
}

function ChargeAction({ item, onOpen }: { item: AdminChargeRow; onOpen: OpenCharge }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      data-charge-id={item.id} aria-label={`Ver detalhes da cobrança ${item.id.slice(0, 8)}`} onClick={() => onOpen(item.id)}>
      <ChevronRight aria-hidden="true" />
    </Button>
  );
}

function ChargeRows({ items, onOpen }: { items: AdminChargeRow[]; onOpen: OpenCharge }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table className="table-fixed" aria-label="Cobranças dinâmicas Pix">
          <colgroup>
            <col className="w-[21%]" /><col className="w-[19%]" /><col className="w-[12%]" />
            <col className="w-[12%]" /><col className="w-[15%]" /><col className="w-[14%]" /><col className="w-[7%]" />
          </colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Cobrança</TableHead><TableHead scope="col">Empresa</TableHead>
              <TableHead scope="col">Criação</TableHead><TableHead scope="col">Vencimento</TableHead><TableHead scope="col">Situação</TableHead>
              <TableHead scope="col" className="text-right">Valor</TableHead><TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-2.5"><ChargeName item={item} /></TableCell>
                <TableCell className="py-2.5">
                  <p className="truncate font-medium" title={item.company}>{item.company}</p>
                  <p className="truncate text-xs text-muted-foreground">Carteira · {item.walletSuffix}</p>
                </TableCell>
                <TableCell className="py-2.5 text-xs tabular-nums text-muted-foreground"><time dateTime={item.createdAt}>{formatDateTime(item.createdAt, "date-only")}</time></TableCell>
                <TableCell className="py-2.5 text-xs tabular-nums"><time dateTime={item.dueDate}>{formatDateTime(item.dueDate, "date-only")}</time></TableCell>
                <TableCell className="py-2.5"><AdminChargeBadge status={item.status} /></TableCell>
                <TableCell className="wrap-anywhere py-2.5 text-right font-semibold tabular-nums"><PanelAmount cents={item.amountInCents} /></TableCell>
                <TableCell className="px-1 py-2 text-center"><ChargeAction item={item} onOpen={onOpen} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul aria-label="Cobranças dinâmicas Pix" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((item) => (
          <li key={item.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-1"><ChargeName item={item} /><ChargeAction item={item} onOpen={onOpen} /></div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-start gap-2">
              <p className="truncate text-sm text-muted-foreground" title={item.company}>{item.company}</p>
              <p className="wrap-anywhere text-right text-sm font-semibold tabular-nums"><PanelAmount cents={item.amountInCents} /></p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <AdminChargeBadge status={item.status} />
              <p className="text-xs tabular-nums text-muted-foreground">Venc. <time dateTime={item.dueDate}>{formatDateTime(item.dueDate, "date-only")}</time></p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminPixChargesScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const params = useSearchParams();
  const query = adminChargeQueryFrom(params);
  const selected = adminChargeId.safeParse(params.get("cobranca")).data;
  const filterKey = adminChargeParams({ ...query, page: 1 });
  const heading = useRef<HTMLHeadingElement>(null);
  const historyCard = useRef<HTMLDivElement>(null);
  const lastOpened = useRef<string>(undefined);
  const result = useQuery({
    enabled: development,
    queryKey: ["admin-pix-charges", user.id, filterKey, query.page],
    queryFn: ({ signal }) => adminPixCharges.list(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === filterKey ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = development ? (denied ? undefined : result.data) : undefined;
  const displayedQuery = { ...query, page: data?.pagination.page ?? query.page };

  function navigate(next: AdminChargeQuery) {
    window.history.replaceState(null, "", adminPixChargesPath + adminChargeParams(next));
  }

  function openCharge(id: string) {
    lastOpened.current = id;
    window.history.pushState({ adminChargeDetails: true }, "", adminPixChargesPath + adminChargeParams(displayedQuery, id));
  }

  function closeCharge() {
    if (window.history.state?.adminChargeDetails) window.history.back();
    else navigate(displayedQuery);
  }

  function restoreFocus() {
    const id = lastOpened.current;
    lastOpened.current = undefined;
    requestAnimationFrame(() => {
      const buttons = historyCard.current?.querySelectorAll<HTMLButtonElement>("button[data-charge-id]");
      const visible = Array.from(buttons ?? []).find((button) => button.dataset.chargeId === id && button.getClientRects().length);
      (visible ?? heading.current)?.focus({ preventScroll: true });
    });
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Cobranças dinâmicas Pix</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Consulte valores, vencimentos e confirmações das cobranças das empresas.</p>
      </header>
      {(result.isLoading || data) && <ChargeSummary data={data} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />

      <Card ref={historyCard} className="min-w-0" aria-labelledby="admin-charge-history">
        <div className="min-w-0 space-y-1 px-4 py-4 sm:px-5">
          <h2 id="admin-charge-history" className="text-balance text-lg font-semibold">Histórico de cobranças</h2>
          <p className="text-pretty text-sm text-muted-foreground">As datas seguem o horário de Brasília.</p>
        </div>
        <ChargeFilters key={query.search} query={query} onChange={navigate} />
        {result.isLoading && <p role="status" className="sr-only">Carregando cobranças</p>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((slot) => (
            <div key={slot} className="flex min-h-17 items-center gap-3 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="ml-auto h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {data ? (
            <>
              {data.items.length ? <ChargeRows items={data.items} onOpen={openCharge} /> : (
                <div className="grid min-h-48 content-center justify-items-center gap-3 px-5 py-6 text-center">
                  <h3 className="text-balance text-base font-semibold">Nenhuma cobrança para os filtros selecionados</h3>
                  {query.period !== "ALL" ? (
                    <Button type="button" variant="outline" className="h-11" onClick={() => navigate({ ...query, period: "ALL", page: 1 })}>Consultar todo o período</Button>
                  ) : (
                    <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Atualizar consulta</Button>
                  )}
                </div>
              )}
              <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação de cobranças Pix" onPageChange={(page) => navigate({ ...query, page })} />
            </>
          ) : !development ? <OperationalDataUnavailable /> : result.isError && (
            <div className="grid min-h-48 content-center justify-items-center gap-3 px-5 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Não foi possível consultar as cobranças</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
      </Card>

      <AdminPixChargeDialog adminId={user.id} id={development ? selected : undefined} onClose={closeCharge}
        onScope={(scope, value) => {
          lastOpened.current = undefined;
          navigate({ ...query, companyId: undefined, accountId: undefined, [scope]: value, page: 1 });
        }}
        onRestoreFocus={restoreFocus}
      />
    </AdminPanel>
  );
}
