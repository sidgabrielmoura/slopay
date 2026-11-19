"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Receipt, Search, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { adminDatePeriod, adminDatePeriodLabels } from "../admin-date-period";
import {
  fetchGlobalStatement, globalStatementHref, globalStatementQuery, globalStatementQueryFrom, statementTypeFilter, statementTypeLabels,
  type GlobalStatementEntry, type GlobalStatementQuery, type GlobalStatementReport,
} from "../admin-global-statement";
import { pixKindLabels, pixTransactionIdentifier, pixTransactionSearch, pixTransactionsPath, type PixTransactionId } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import { AdminCsvExport, downloadAdminCsv } from "./admin-csv-export";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";
import { PixTransactionDialog } from "./pix-transaction-detail";

const initialQuery = globalStatementQuery.parse({});
const types = [
  { value: "ALL", label: "Todos os lançamentos" }, { value: "CREDIT", label: "Créditos" },
  { value: "DEBIT", label: "Débitos" }, { value: "FEE_DEBIT", label: "Tarifas" },
];
const periods = adminDatePeriod.options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));
const dateLabels = { SETTLED: "Efetivação", RECORDED: "Registro no Slopay" };
const summaries = [
  { key: "creditCents", label: "Créditos" }, { key: "debitCents", label: "Débitos" },
  { key: "feeCents", label: "Tarifas" }, { key: "netCents", label: "Resultado do recorte", note: "Créditos menos débitos e tarifas" },
] as const;
const appearance = {
  CREDIT: { icon: ArrowDownLeft, className: "bg-[var(--success-surface)] text-[var(--success)]" },
  DEBIT: { icon: ArrowUpRight, className: "bg-secondary text-muted-foreground" },
  FEE_DEBIT: { icon: Receipt, className: "bg-[var(--warning-surface)] text-[var(--warning)]" },
};

function entryKey(item: GlobalStatementEntry) {
  return `${item.kind}:${item.transactionId}:${item.type}`;
}

async function exportPage(query: GlobalStatementQuery) {
  const { pagination, items } = await fetchGlobalStatement(query);
  if (pagination.page !== query.page || !items.length) {
    throw new Error("A página mudou. Confira os resultados antes de exportar.");
  }
  const columns = ["ID da transação", "Lançamento", "Operação Pix", "Empresa", "Carteira (final)", "Data e hora (Brasília)", "Origem da data", "Valor (BRL)"];
  const rows = items.map((item) => [
    item.transactionId, statementTypeLabels[item.type], pixKindLabels[item.kind], item.company, item.walletSuffix,
    formatDateTime(item.occurredAt, item.dateOnly ? "date-only" : "medium"), dateLabels[item.dateSource], { cents: item.amountInCents },
  ]);
  downloadAdminCsv(`extrato-global-pagina-${query.page}.csv`, columns, rows);
}

function StatementFilters({ query, onChange }: {
  query: GlobalStatementQuery; onChange: (next: GlobalStatementQuery) => void;
}) {
  const [draft, setDraft] = useState({ original: query.search, value: query.search });
  const searchInput = useRef<HTMLInputElement>(null);
  const value = draft.original === query.search ? draft.value : query.search;
  const changed = query.companyId || query.accountId || query.search || query.type !== "ALL" || query.period !== initialQuery.period;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = pixTransactionSearch.safeParse(value);
    if (!parsed.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ original: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar extrato global" className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5" onSubmit={submit}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="statement-search" className="text-sm font-medium">Buscar lançamento</label>
          <div className="flex min-w-0 gap-2">
            <Input ref={searchInput} id="statement-search" type="search" className="h-11 min-w-0" placeholder="Empresa, CNPJ, carteira ou ID"
              autoComplete="off" maxLength={120} value={value} onChange={(event) => setDraft({ original: query.search, value: event.target.value })} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar lançamento"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="statement-type" className="text-sm font-medium">Tipo de lançamento</span>
          <GlideSelect aria-labelledby="statement-type" options={types} value={query.type} size="lg" menuWidth={218}
            onChange={(type) => onChange({ ...query, type: statementTypeFilter.parse(type), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="statement-period" className="text-sm font-medium">Período</span>
          <GlideSelect aria-labelledby="statement-period" options={periods} value={query.period} size="lg"
            onChange={(period) => onChange({ ...query, period: adminDatePeriod.parse(period), page: 1 })} />
        </div>
      </div>
      {changed && (
        <div className="flex min-w-0 flex-wrap gap-2">
          {query.companyId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => {
            searchInput.current?.focus();
            onChange({ ...query, companyId: undefined, page: 1 });
          }}>Remover filtro de empresa <X aria-hidden="true" /></Button>}
          {query.accountId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => {
            searchInput.current?.focus();
            onChange({ ...query, accountId: undefined, page: 1 });
          }}>Remover filtro de carteira <X aria-hidden="true" /></Button>}
          <Button type="button" variant="ghost" size="sm" className="h-11" onClick={() => {
            searchInput.current?.focus();
            setDraft({ original: "", value: "" });
            onChange(initialQuery);
          }}>Limpar filtros</Button>
        </div>
      )}
    </form>
  );
}

function StatementSummary({ data, loading }: { data?: GlobalStatementReport["summary"]; loading: boolean }) {
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>{summaries.map(({ key }) => (
        <div key={key} className="grid min-h-24 min-w-0 content-start gap-2.5 bg-card p-4 sm:p-5">
          <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-4/5 animate-none" />
        </div>
      ))}</div>
    }>
      {data && <dl aria-label="Totais dos lançamentos filtrados" className={grid}>{summaries.map((metric) => (
        <div key={metric.key} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
          <dt className="text-sm text-muted-foreground">{metric.label}</dt>
          <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">
            <PanelAmount cents={data[metric.key]} showSign={metric.key === "netCents"} />
          </dd>
          {"note" in metric && <dd className="text-pretty text-xs text-muted-foreground">{metric.note}</dd>}
        </div>
      ))}</dl>}
    </SkeletonReveal>
  );
}

function StatementIdentity({ item }: { item: GlobalStatementEntry }) {
  const { icon: Icon, className } = appearance[item.type];
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", className)}><Icon className="size-4" aria-hidden="true" /></span>
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">{statementTypeLabels[item.type]}</p>
        <p className="text-pretty text-xs text-muted-foreground">{pixKindLabels[item.kind]}</p>
      </div>
    </div>
  );
}

function StatementCompany({ item }: { item: GlobalStatementEntry }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-sm font-medium" title={item.company}>{item.company}</p>
      <p className="truncate text-xs tabular-nums text-muted-foreground">{item.walletSuffix ? `Carteira final ${item.walletSuffix}` : "Carteira sem identificação"}</p>
    </div>
  );
}

function StatementDate({ item }: { item: GlobalStatementEntry }) {
  const date = formatDateTime(item.occurredAt, "date-only");
  return (
    <div className="space-y-0.5 text-xs">
      <time dateTime={item.dateOnly ? date.split("/").reverse().join("-") : item.occurredAt} className="tabular-nums">
        {item.dateOnly ? date : formatDateTime(item.occurredAt)}
      </time>
      {item.dateSource === "RECORDED" && <p className="text-muted-foreground">{dateLabels.RECORDED}</p>}
    </div>
  );
}

type OpenEntry = (item: GlobalStatementEntry, trigger: HTMLButtonElement) => void;

function OpenEntryButton({ item, onOpen }: { item: GlobalStatementEntry; onOpen: OpenEntry }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      aria-label={`Ver transação de origem do lançamento de ${statementTypeLabels[item.type].toLowerCase()} ${item.transactionId.slice(0, 8)}`}
      onClick={(event) => onOpen(item, event.currentTarget)}>
      <ChevronRight aria-hidden="true" />
    </Button>
  );
}

function StatementRows({ items, onOpen }: { items: GlobalStatementEntry[]; onOpen: OpenEntry }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Lançamentos do Extrato Global" className="table-fixed">
          <colgroup><col className="w-[23%]" /><col className="w-[29%]" /><col className="w-[23%]" /><col className="w-[19%]" /><col className="w-[6%]" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Lançamento</TableHead><TableHead scope="col">Empresa e carteira</TableHead>
              <TableHead scope="col">Data no extrato</TableHead><TableHead scope="col" className="text-right">Valor</TableHead>
              <TableHead scope="col"><span className="sr-only">Transação de origem</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((item) => (
            <TableRow key={entryKey(item)}>
              <TableCell className="py-2.5"><StatementIdentity item={item} /></TableCell>
              <TableCell className="py-2.5"><StatementCompany item={item} /></TableCell>
              <TableCell className="py-2.5"><StatementDate item={item} /></TableCell>
              <TableCell className="wrap-anywhere py-2.5 text-right font-semibold tabular-nums"><PanelAmount cents={item.amountInCents} showSign /></TableCell>
              <TableCell className="px-1 py-2 text-right"><OpenEntryButton item={item} onOpen={onOpen} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Lançamentos do Extrato Global" className="min-w-0 divide-y divide-border xl:hidden">{items.map((item) => (
        <li key={entryKey(item)} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2"><StatementIdentity item={item} /><OpenEntryButton item={item} onOpen={onOpen} /></div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-start gap-2">
            <StatementCompany item={item} />
            <p className="wrap-anywhere text-right text-sm font-semibold tabular-nums"><PanelAmount cents={item.amountInCents} showSign /></p>
          </div>
          <StatementDate item={item} />
        </li>
      ))}</ul>
    </>
  );
}

function EmptyStatement({ query, onChange }: { query: GlobalStatementQuery; onChange: (next: GlobalStatementQuery) => void }) {
  return (
    <div className="grid min-h-44 content-center justify-items-center gap-3 px-5 py-6 text-center">
      <h3 className="text-balance text-base font-semibold">Nenhum lançamento encontrado</h3>
      {query.search || query.type !== "ALL" || query.companyId || query.accountId ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => onChange({ ...initialQuery, period: query.period })}>Limpar filtros</Button>
      ) : query.period !== "ALL" ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => onChange({ ...query, period: "ALL", page: 1 })}>Consultar todo o período</Button>
      ) : (
        <Button asChild variant="outline" className="h-11"><Link href={pixTransactionsPath} prefetch={false}>Ver transações Pix</Link></Button>
      )}
    </div>
  );
}

export function AdminGlobalStatementScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const params = useSearchParams();
  const query = globalStatementQueryFrom(params);
  const selection = pixTransactionIdentifier.safeParse({ kind: params.get("detail"), id: params.get("transaction") }).data;
  const filters = globalStatementHref({ ...query, page: 1 });
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLButtonElement>(null);
  const result = useQuery({
    enabled: development,
    queryKey: ["admin-global-statement", user.id, filters, query.page],
    queryFn: ({ signal }) => fetchGlobalStatement(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === filters ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = development ? (denied ? undefined : result.data) : undefined;
  const displayedQuery = { ...query, page: data?.pagination.page ?? query.page };

  function navigate(next: GlobalStatementQuery) {
    window.history.replaceState(null, "", globalStatementHref(next));
  }

  function openDetail(item: PixTransactionId) {
    const href = globalStatementHref(displayedQuery, item);
    if (selection) window.history.replaceState({ statementDetail: Boolean(window.history.state?.statementDetail) }, "", href);
    else window.history.pushState({ statementDetail: true }, "", href);
  }

  function closeDetail() {
    if (window.history.state?.statementDetail) window.history.back();
    else navigate(displayedQuery);
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Extrato Global</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Consulte os créditos, débitos e tarifas de Pix confirmados das empresas.</p>
      </header>
      {(result.isLoading || data) && <StatementSummary data={data?.summary} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="statement-entries">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="space-y-1">
            <h2 id="statement-entries" className="text-balance text-lg font-semibold">Lançamentos</h2>
            <p className="text-pretty text-sm text-muted-foreground">Horário de Brasília. Tarifas aparecem em linhas próprias.</p>
          </div>
          <AdminCsvExport page={displayedQuery.page} disabled={!data?.items.length || result.isPlaceholderData || result.isError}
            description="O CSV vai incluir os valores dos lançamentos desta página com os filtros atuais."
            onExport={() => exportPage(displayedQuery)} onRefresh={() => void result.refetch()} />
        </header>
        <StatementFilters query={query} onChange={navigate} />
        {result.isLoading && <p role="status" className="sr-only">Carregando lançamentos do extrato</p>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((row) => (
            <div key={row} className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
              <Skeleton className="size-9 shrink-0 animate-none" /><Skeleton className="h-4 w-2/5 animate-none" />
              <Skeleton className="ml-auto h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {data ? data.items.length ? (
            <>
              <StatementRows items={data.items} onOpen={(item, button) => {
                origin.current = button;
                openDetail({ kind: item.kind, id: item.transactionId });
              }} />
              <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação do Extrato Global"
                onPageChange={(page) => navigate({ ...query, page })} />
            </>
          ) : <EmptyStatement query={query} onChange={navigate} /> : !development ? <OperationalDataUnavailable /> : result.isError && (
            <div className="grid min-h-44 content-center justify-items-center gap-3 px-5 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Não foi possível consultar o extrato</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
      </Card>
      <PixTransactionDialog adminId={user.id} selection={denied ? undefined : selection} onClose={closeDetail} onOpen={openDetail}
        onScope={(scope, value) => {
          origin.current = null;
          navigate({ ...query, companyId: undefined, accountId: undefined, [scope]: value, page: 1 });
        }}
        onRestoreFocus={() => {
          const control = origin.current;
          (control?.getClientRects().length ? control : heading.current)?.focus({ preventScroll: true });
          origin.current = null;
        }} />
    </AdminPanel>
  );
}
