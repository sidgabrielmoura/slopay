"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Layers2, Search, Undo2, X } from "lucide-react";
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
import { formatDateTime } from "@/lib/dates";
import { adminDatePeriodLabels } from "../admin-date-period";
import {
  adminPixTransactions, pixKindLabels, pixQueryFrom, pixQueryString, pixStatusLabels, pixTransactionIdentifier,
  pixTransactionQuery, pixTransactionSearch, pixTransactionsPath,
  type PixTransactionId, type PixTransactionRow, type PixTransactionsQuery, type PixTransactionsReport,
} from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";
import { PixTransactionDialog, PixTransactionStatus } from "./pix-transaction-detail";
import { PixTransactionExport } from "./pix-transaction-export";

const count = new Intl.NumberFormat("pt-BR");
const operationIcons = { RECEIVE: ArrowDownLeft, WITHDRAW: ArrowUpRight, BATCH: Layers2, REFUND: Undo2 };
const { type: kindFilter, status: statusFilter, period: periodFilter } = pixTransactionQuery.shape;
const kinds = kindFilter.unwrap().options.map((value) => ({ value, label: value === "ALL" ? "Todos os tipos" : pixKindLabels[value] }));
const statuses = statusFilter.unwrap().options.map((value) => ({ value, label: value === "ALL" ? "Todas as situações" : pixStatusLabels[value] }));
const periods = periodFilter.unwrap().options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));
const initialQuery = pixTransactionQuery.parse({});

function PixFilters({ query, onChange }: {
  query: PixTransactionsQuery; onChange: (query: PixTransactionsQuery) => void;
}) {
  const [draft, setDraft] = useState(query.search);
  const { search, type, status, period, companyId, accountId } = query;
  const canClear = search || companyId || accountId || status !== "ALL" || type !== "ALL" || period !== initialQuery.period;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = pixTransactionSearch.safeParse(draft);
    if (!input.success) { toast.error("Confira o texto da busca."); return; }
    setDraft(input.data);
    onChange({ ...query, search: input.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar transações Pix" className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5" onSubmit={submit}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2">
          <label htmlFor="admin-pix-search" className="text-sm font-medium">Buscar transação</label>
          <div className="flex min-w-0 gap-2">
            <Input id="admin-pix-search" type="search" maxLength={120} placeholder="Empresa, CNPJ, carteira ou ID"
              className="h-11 min-w-0" value={draft} onChange={(event) => setDraft(event.target.value)} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar transação">
              <Search aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-pix-type" className="text-sm font-medium">Tipo</span>
          <GlideSelect aria-labelledby="admin-pix-type" size="lg" options={kinds} value={type}
            onChange={(value) => onChange({ ...query, type: kindFilter.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-pix-status" className="text-sm font-medium">Situação</span>
          <GlideSelect aria-labelledby="admin-pix-status" size="lg" options={statuses} value={status} menuWidth={225}
            onChange={(value) => onChange({ ...query, status: statusFilter.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="admin-pix-period" className="text-sm font-medium">Período</span>
          <GlideSelect aria-labelledby="admin-pix-period" size="lg" options={periods} value={period}
            onChange={(value) => onChange({ ...query, period: periodFilter.parse(value), page: 1 })} />
        </div>
      </div>
      {canClear && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {companyId && <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => onChange({ ...query, companyId: undefined, page: 1 })}>
            Remover filtro de empresa <X aria-hidden="true" />
          </Button>}
          {accountId && <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => onChange({ ...query, accountId: undefined, page: 1 })}>
            Remover filtro de conta <X aria-hidden="true" />
          </Button>}
          <Button type="button" variant="ghost" size="sm" className="h-10" onClick={() => { setDraft(""); onChange(initialQuery); }}>Limpar filtros</Button>
        </div>
      )}
    </form>
  );
}

function PixSummary({ summary, loading }: { summary?: PixTransactionsReport["summary"]; loading: boolean }) {
  const metrics = summary && [
    { title: "Recebimentos confirmados", value: summary.receivedCents, count: summary.receivedCount },
    { title: "Saques confirmados", value: summary.withdrawnCents, count: summary.withdrawnCount },
    { title: "Estornos registrados", value: summary.refundedCents, count: summary.refundedCount },
    { title: "Tarifas registradas", value: summary.feeCents, count: summary.feeCount },
  ];
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>
        {["Recebimentos", "Saques", "Estornos", "Tarifas"].map((label) => (
          <div key={label} className="grid min-w-0 content-center gap-2.5 bg-card p-4 sm:p-5">
            <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-4/5 animate-none" /><Skeleton className="h-3 w-1/2 animate-none" />
          </div>
        ))}
      </div>
    }>
      {metrics && (
        <dl aria-label="Totais confirmados com os filtros atuais" className={grid}>
          {metrics.map((metric) => (
            <div key={metric.title} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
              <dt className="text-sm text-muted-foreground">{metric.title}</dt>
              <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">
                {metric.value === null ? <span aria-label="Sem tarifa registrada">—</span> : <PanelAmount cents={metric.value} />}
              </dd>
              <dd className="text-xs tabular-nums text-muted-foreground">{count.format(metric.count)} {metric.count === 1 ? "registro" : "registros"}</dd>
            </div>
          ))}
        </dl>
      )}
    </SkeletonReveal>
  );
}

type OpenTransaction = (item: PixTransactionRow, trigger: HTMLButtonElement) => void;

function TransactionIdentity({ item }: { item: PixTransactionRow }) {
  const Icon = operationIcons[item.kind];
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" aria-hidden="true" /></span>
      <div className="min-w-0 space-y-0.5">
        <div className="truncate font-medium">{pixKindLabels[item.kind]}</div>
        <div className="font-mono text-xs text-muted-foreground" title={item.id}>{item.id.slice(0, 8)}</div>
      </div>
    </div>
  );
}

function TransactionTime({ item }: { item: PixTransactionRow }) {
  const date = formatDateTime(item.occurredAt, "date-only");
  return (
    <time dateTime={item.dateOnly ? date.split("/").reverse().join("-") : item.occurredAt} className="text-xs tabular-nums text-muted-foreground">
      <span className="block">{date}</span>
      {!item.dateOnly && <span className="block">{formatDateTime(item.occurredAt, "time-only")}</span>}
    </time>
  );
}

function OpenButton({ item, onOpen }: { item: PixTransactionRow; onOpen: OpenTransaction }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      aria-label={`Ver detalhes de ${pixKindLabels[item.kind]} ${item.id.slice(0, 8)}`}
      onClick={(event) => onOpen(item, event.currentTarget)}><ChevronRight aria-hidden="true" /></Button>
  );
}

function TransactionAmount({ item }: { item: PixTransactionRow }) {
  return (
    <div className="min-w-0 text-right tabular-nums">
      <p className="wrap-anywhere font-semibold"><PanelAmount cents={item.amountInCents} /></p>
      {item.feeInCents !== null && <p className="wrap-anywhere text-xs text-muted-foreground">Tarifa <PanelAmount cents={item.feeInCents} /></p>}
    </div>
  );
}

function TransactionRows({ items, onOpen }: { items: PixTransactionRow[]; onOpen: OpenTransaction }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table className="table-fixed" aria-label="Transações Pix">
          <colgroup>
            <col className="w-[23%]" /><col className="w-[20%]" /><col className="w-[12%]" />
            <col className="w-[21%]" /><col className="w-[17%]" /><col className="w-[7%]" />
          </colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Operação</TableHead><TableHead scope="col">Empresa</TableHead>
              <TableHead scope="col">Data</TableHead><TableHead scope="col">Situação</TableHead>
              <TableHead scope="col" className="text-right">Valor bruto</TableHead><TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.kind}:${item.id}`}>
                <TableCell className="py-2.5"><TransactionIdentity item={item} /></TableCell>
                <TableCell className="py-2.5">
                  <p className="truncate font-medium" title={item.company}>{item.company}</p>
                  <p className="truncate text-xs text-muted-foreground">Carteira · {item.walletSuffix}</p>
                </TableCell>
                <TableCell className="py-2.5"><TransactionTime item={item} /></TableCell>
                <TableCell className="py-2.5"><PixTransactionStatus item={item} />
                  {item.simulated && <p className="mt-0.5 text-xs text-muted-foreground">Simulação</p>}
                </TableCell>
                <TableCell className="py-2.5"><TransactionAmount item={item} /></TableCell>
                <TableCell className="px-1 py-2 text-center"><OpenButton item={item} onOpen={onOpen} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul aria-label="Transações Pix" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`} className="grid min-w-0 gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-1">
              <TransactionIdentity item={item} /><OpenButton item={item} onOpen={onOpen} />
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] items-start gap-2">
              <p className="truncate text-sm text-muted-foreground" title={item.company}>{item.company}</p>
              <TransactionAmount item={item} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5"><PixTransactionStatus item={item} />
                {item.simulated && <span className="text-xs text-muted-foreground">Simulação</span>}
              </div>
              <TransactionTime item={item} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminPixTransactionsScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const params = useSearchParams();
  const query = pixQueryFrom(params);
  const selection = pixTransactionIdentifier.safeParse({ kind: params.get("detail"), id: params.get("transaction") }).data;
  const filterKey = pixQueryString({ ...query, page: 1 });
  const title = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const result = useQuery({
    enabled: development,
    queryKey: ["admin-pix-transactions", user.id, filterKey, query.page],
    queryFn: ({ signal }) => adminPixTransactions.list(query, signal),
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === filterKey ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const data = development ? (result.data) : undefined;
  const displayedQuery = { ...query, page: data?.pagination.page ?? query.page };

  function navigate(next: PixTransactionsQuery) {
    window.history.replaceState(null, "", pixTransactionsPath + pixQueryString(next));
  }

  function openDetail(item: PixTransactionId) {
    const href = pixTransactionsPath + pixQueryString(displayedQuery, item);
    if (selection) window.history.replaceState({ pixDetail: Boolean(window.history.state?.pixDetail) }, "", href);
    else window.history.pushState({ pixDetail: true }, "", href);
  }

  function closeDetail() {
    if (window.history.state?.pixDetail) window.history.back();
    else navigate(displayedQuery);
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={title} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Transações Pix</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Acompanhe recebimentos, saques e estornos registrados pelas empresas.</p>
      </header>
      {(result.isLoading || data) && <PixSummary summary={data?.summary} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="admin-pix-history">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0 space-y-1">
            <h2 id="admin-pix-history" className="text-balance text-lg font-semibold">Histórico de transações</h2>
            <p className="text-pretty text-sm text-muted-foreground">As datas seguem o horário de Brasília.</p>
          </div>
          <PixTransactionExport query={displayedQuery} disabled={!data?.items.length || result.isPlaceholderData || result.isError} onRefresh={() => void result.refetch()} />
        </div>
        <PixFilters key={query.search} query={query} onChange={navigate} />
        {result.isLoading && <p role="status" className="sr-only">Carregando transações</p>}
        <SkeletonReveal flow revealed={!result.isLoading}
          skeleton={<div className="divide-y divide-border">{[1, 2, 3, 4].map((line) => (
            <div key={line} className="flex min-h-17 items-center gap-3 px-4 sm:px-5">
              <Skeleton className="size-9 shrink-0 animate-none" /><Skeleton className="h-4 w-2/5 animate-none" />
              <Skeleton className="ml-auto h-4 w-1/5 animate-none" />
            </div>
          ))}</div>}
        >
          {data ? (
            <>
              {data.items.length ? <TransactionRows items={data.items} onOpen={(item, button) => {
                trigger.current = button;
                openDetail(item);
              }} /> : (
                <div className="grid min-h-48 content-center justify-items-center gap-3 px-5 py-6 text-center">
                  <h3 className="text-balance text-base font-semibold">Nenhuma transação para os filtros selecionados</h3>
                  {query.period !== "ALL" ? (
                    <Button type="button" variant="outline" className="h-11" onClick={() => navigate({ ...query, period: "ALL", page: 1 })}>Consultar todo o período</Button>
                  ) : (
                    <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Atualizar consulta</Button>
                  )}
                </div>
              )}
              <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação de transações Pix"
                onPageChange={(page) => navigate({ ...query, page })} />
            </>
          ) : !development ? <OperationalDataUnavailable /> : result.isError && (
            <div className="grid min-h-48 content-center justify-items-center gap-3 px-5 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Não foi possível consultar as transações</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
      </Card>
      <PixTransactionDialog adminId={user.id} selection={development ? selection : undefined} onClose={closeDetail} onOpen={openDetail}
        onScope={(scope, value) => {
          trigger.current = null;
          navigate({ ...query, companyId: undefined, accountId: undefined, [scope]: value, page: 1 });
        }}
        onRestoreFocus={() => {
          const control = trigger.current;
          (control?.getClientRects().length ? control : title.current)?.focus({ preventScroll: true });
          trigger.current = null;
        }}
      />
    </AdminPanel>
  );
}
