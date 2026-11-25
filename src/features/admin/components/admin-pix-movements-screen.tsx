"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Layers2, QrCode, Receipt, Search, Undo2, X, type LucideIcon } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { useDevelopmentFeatures } from "@/providers/app-providers";
import { adminDatePeriod, adminDatePeriodLabels } from "../admin-date-period";
import { movementOriginLabel, type MovementOrigin } from "../admin-movement-origin";
import { fetchGlobalStatement, statementTypeFilter, statementTypeLabels, type GlobalStatementQuery } from "../admin-global-statement";
import { adminChargeQuery, adminChargeStatusLabels } from "../admin-pix-charges";
import {
  fetchPixMovements, pixMovementHref, pixMovementQueryFrom, pixMovementSelection, pixMovementView,
  pixMovementViewQuery, type PixMovementQuery, type PixMovementReport,
} from "../admin-pix-movements";
import { pixKindLabels, pixStatusLabels, pixTransactionQuery, pixTransactionSearch, type PixTransactionId } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import { AdminCsvExport, downloadAdminCsv } from "./admin-csv-export";
import { AdminChargeBadge } from "./admin-pix-charge-detail";
import { MovementPartiesFilter } from "./movement-parties-filter";
import type { AdminIdentity } from "./layout/admin-panel";
import { PixTransactionDialog, PixTransactionStatus } from "./pix-transaction-detail";
import { PixTransactionExport } from "./pix-transaction-export";
import { useAdminAccess } from "./admin-access-provider";
import { exportGlobalStatement } from "../admin-global-statement";
import type { MovementBalance } from "../admin-movement-balance";

const views = {
  all: { label: "Todas", period: "Data da movimentação", firstColumn: "Operação", dateColumn: "Movimentação" },
  charges: { label: "Cobranças", period: "Data de criação", firstColumn: "Cobrança", dateColumn: "Criação" },
  statement: { label: "Extrato", period: "Data de efetivação ou de registro", firstColumn: "Lançamento", dateColumn: "Data no extrato" },
} as const;
const periods = adminDatePeriod.options.map(value => ({ value, label: adminDatePeriodLabels[value] }));
const transactionTypes = pixTransactionQuery.shape.type.unwrap();
const transactionStatuses = pixTransactionQuery.shape.status.unwrap();
const chargeStatuses = adminChargeQuery.shape.status.unwrap();
const transactionTypeOptions = transactionTypes.options.map(value => ({ value, label: value === "ALL" ? "Todos os tipos" : pixKindLabels[value] }));
const transactionStatusOptions = transactionStatuses.options.map(value => ({ value, label: value === "ALL" ? "Todas as situações" : pixStatusLabels[value] }));
const chargeStatusOptions = chargeStatuses.options.map(value => ({ value, label: value === "ALL" ? "Todas as situações" : adminChargeStatusLabels[value] }));
const entryTypeOptions = [
  { value: "ALL", label: "Todos os lançamentos" }, { value: "CREDIT", label: "Créditos" },
  { value: "DEBIT", label: "Débitos" }, { value: "FEE_DEBIT", label: "Tarifas" },
];
const count = new Intl.NumberFormat("pt-BR");

function MovementFilters({ adminId, query, onChange }: { adminId: string; query: PixMovementQuery; onChange: (value: PixMovementQuery) => void }) {
  const searchInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ previous: query.search, value: query.search });
  const search = draft.previous === query.search ? draft.value : query.search;
  const filtered = query.search || query.companyId || query.accountId || query.merchantId || query.provider || query.period !== "LAST_30_DAYS" ||
    ("type" in query && query.type !== "ALL") || ("status" in query && query.status !== "ALL");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = pixTransactionSearch.safeParse(search);
    if (!parsed.success) { toast.error("Confira o texto da busca."); return; }
    setDraft({ previous: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar movimentações Pix" onSubmit={submit}
      className="grid min-w-0 gap-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:min-w-64 lg:flex-2">
          <label htmlFor="pix-movement-search" className="text-sm font-medium">Buscar</label>
          <div className="flex min-w-0 gap-2">
            <Input id="pix-movement-search" ref={searchInput} type="search" className="h-11 min-w-0" maxLength={120} autoComplete="off"
              placeholder="Empresa, CNPJ, carteira ou ID" value={search}
              onChange={event => setDraft({ previous: query.search, value: event.target.value })} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar movimentações"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2 lg:min-w-40 lg:flex-1">
          <span id="pix-movement-period" className="text-sm font-medium">Período</span>
          <GlideSelect size="lg" aria-labelledby="pix-movement-period" value={query.period} options={periods}
            onChange={period => onChange({ ...query, period: adminDatePeriod.parse(period), page: 1 })} />
        </div>
        {query.view === "all" && (
          <div className="grid min-w-0 gap-2 lg:min-w-40 lg:flex-1">
            <span id="pix-movement-type" className="text-sm font-medium">Tipo de operação</span>
            <GlideSelect size="lg" aria-labelledby="pix-movement-type" value={query.type} options={transactionTypeOptions}
              onChange={type => onChange({ ...query, type: transactionTypes.parse(type), page: 1 })} />
          </div>
        )}
        {query.view === "statement" ? (
          <div className="grid min-w-0 gap-2 lg:min-w-40 lg:flex-1">
            <span id="pix-movement-entry" className="text-sm font-medium">Tipo de lançamento</span>
            <GlideSelect size="lg" aria-labelledby="pix-movement-entry" value={query.type} options={entryTypeOptions}
              onChange={type => onChange({ ...query, type: statementTypeFilter.parse(type), page: 1 })} />
          </div>
        ) : (
          <div className="grid min-w-0 gap-2 lg:min-w-40 lg:flex-1">
            <span id="pix-movement-status" className="text-sm font-medium">Situação</span>
            <GlideSelect size="lg" aria-labelledby="pix-movement-status" value={query.status}
              options={query.view === "charges" ? chargeStatusOptions : transactionStatusOptions}
              onChange={status => onChange(query.view === "charges" ? { ...query, status: chargeStatuses.parse(status), page: 1 }
                : { ...query, status: transactionStatuses.parse(status), page: 1 })} />
          </div>
        )}
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <MovementPartiesFilter adminId={adminId} query={query} onChange={onChange} />
      </div>
      {filtered && <div className="flex min-w-0 flex-wrap items-center gap-2">
        {(["companyId", "accountId"] as const).map((scope) => query[scope] && (
          <Button key={scope} type="button" variant="outline" size="sm" className="min-h-11"
            onClick={() => { searchInput.current?.focus(); onChange({ ...query, [scope]: undefined, page: 1 }); }}>
            {scope === "companyId" ? "Remover empresa" : "Remover carteira"}<X aria-hidden="true" />
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => {
          searchInput.current?.focus();
          setDraft({ previous: "", value: "" });
          onChange(pixMovementViewQuery(query.view, pixMovementQueryFrom(new URLSearchParams())));
        }}>Limpar filtros</Button>
      </div>}
    </form>
  );
}

function movementMetrics(report: PixMovementReport): { label: string; value: number | null; entries?: number; signed?: boolean }[] {
  if (report.view === "charges") {
    const { registeredCents, outstandingCents, outstandingCount, receivedCents, receivedCount, reviewCents, reviewCount } = report.summary;
    return [
      { label: "Registrado", value: registeredCents, entries: report.pagination.total },
      { label: "Em aberto", value: outstandingCents, entries: outstandingCount },
      { label: "Recebido bruto", value: receivedCents, entries: receivedCount },
      { label: "Em revisão", value: reviewCents, entries: reviewCount },
    ];
  }
  if (report.view === "statement") {
    const { creditCents, debitCents, feeCents, netCents } = report.summary;
    return [
      { label: "Créditos", value: creditCents }, { label: "Débitos", value: debitCents },
      { label: "Tarifas", value: feeCents }, { label: "Líquido do período", value: netCents, signed: true },
    ];
  }
  const { receivedCents, receivedCount, withdrawnCents, withdrawnCount, refundedCents, refundedCount, feeCents, feeCount } = report.summary;
  return [
    { label: "Recebimentos confirmados", value: receivedCents, entries: receivedCount },
    { label: "Saques confirmados", value: withdrawnCents, entries: withdrawnCount },
    { label: "Estornos registrados", value: refundedCents, entries: refundedCount },
    { label: "Tarifas registradas", value: feeCents, entries: feeCount },
  ];
}

function MovementSummary({ report, loading }: { report?: PixMovementReport; loading: boolean }) {
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>{[1, 2, 3, 4].map(cell => <div key={cell} className="grid min-w-0 gap-2.5 bg-card p-4">
        <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-4/5 animate-none" />
      </div>)}</div>
    }>
      {report && <dl aria-label="Totais com os filtros atuais" className={grid}>{movementMetrics(report).map(metric => (
        <div key={metric.label} className="min-w-0 space-y-1 bg-card p-4">
          <dt className="text-sm text-muted-foreground">{metric.label}</dt>
          <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">
            {metric.value === null ? "Sem registro" : <PanelAmount cents={metric.value} showSign={metric.signed} />}
          </dd>
          {metric.entries !== undefined && <dd className="text-xs tabular-nums text-muted-foreground">
            {count.format(metric.entries)} {metric.entries === 1 ? "registro" : "registros"}
          </dd>}
        </div>
      ))}</dl>}
    </SkeletonReveal>
  );
}

type MovementRow = {
  key: string;
  detail: PixTransactionId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  company: string;
  companyId: string | null;
  walletSuffix: string;
  accountId: string | null;
  date: string;
  dateOnly?: boolean;
  registeredDate?: boolean;
  due?: string | null;
  status?: ReactNode;
  amount: number;
  fee?: number | null;
  signed?: boolean;
  balance?: MovementBalance | null;
  origin: MovementOrigin;
};
const icons = { RECEIVE: ArrowDownLeft, WITHDRAW: ArrowUpRight, BATCH: Layers2, REFUND: Undo2 };
const entryIcons = { CREDIT: ArrowDownLeft, DEBIT: ArrowUpRight, FEE_DEBIT: Receipt };

function movementRows(report: PixMovementReport): MovementRow[] {
  if (report.view === "charges") return report.items.map(item => ({
    key: item.id, detail: { kind: "RECEIVE", id: item.id }, title: "Cobrança Pix", subtitle: item.description || item.id.slice(0, 8),
    icon: QrCode, company: item.company, companyId: item.companyId, walletSuffix: item.walletSuffix, accountId: item.accountId,
    date: item.createdAt, due: item.dueDate, origin: item.origin,
    status: <AdminChargeBadge status={item.status} />, amount: item.amountInCents,
  }));
  if (report.view === "statement") return report.items.map(item => ({
    key: item.kind + ":" + item.transactionId + ":" + item.type, detail: { kind: item.kind, id: item.transactionId },
    title: statementTypeLabels[item.type], subtitle: pixKindLabels[item.kind], icon: entryIcons[item.type], company: item.company,
    companyId: item.companyId, walletSuffix: item.walletSuffix, accountId: item.accountId,
    date: item.occurredAt, dateOnly: item.dateOnly, registeredDate: item.dateSource === "RECORDED",
    amount: item.amountInCents, signed: true, origin: item.origin,
  }));
  return report.items.map(item => ({
    key: item.kind + ":" + item.id, detail: { kind: item.kind, id: item.id }, title: pixKindLabels[item.kind], subtitle: item.id.slice(0, 8),
    icon: icons[item.kind], company: item.company, companyId: item.companyId, walletSuffix: item.walletSuffix, accountId: item.accountId,
    date: item.occurredAt, dateOnly: item.dateOnly,
    status: <><PixTransactionStatus item={item} />{item.simulated && <p className="text-xs text-muted-foreground">Simulação</p>}</>,
    amount: item.amountInCents, fee: item.feeInCents, balance: item.balance, origin: item.origin,
  }));
}

type OpenMovement = (item: PixTransactionId, trigger: HTMLButtonElement) => void;
type FilterByScope = (scope: "companyId" | "accountId", id: string) => void;

function MovementTable({ report, open, filter }: { report: PixMovementReport; open: OpenMovement; filter: FilterByScope }) {
  const view = views[report.view];
  const rows = movementRows(report);
  const columns = [
    { title: view.firstColumn, width: "w-56" },
    { title: "Empresa e carteira", width: "w-52" },
    { title: view.dateColumn, width: "w-40" },
  ];
  if (report.view === "charges") columns.push({ title: "Vencimento", width: "w-36" });
  if (report.view !== "statement") columns.push({ title: "Situação", width: "w-36" });
  columns.push({ title: "Origem", width: "w-32" });
  const showBalance = report.view === "all" && report.environment === "live";
  if (showBalance) columns.push({ title: "Saldo antes e depois", width: "w-48" });
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label={view.label + " · Movimentações Pix"} className="table-fixed"
          scrollLabel="Rolagem da tabela de movimentações">
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              {columns.map(({ title, width }) => <TableHead key={title} scope="col" className={width}>{title}</TableHead>)}
              <TableHead scope="col" className="w-36 text-right">Valor</TableHead>
              <TableHead scope="col" className="w-20"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows.map(row => {
            const parts = movementCells(row, open, filter);
            return <TableRow key={row.key}>
              <TableCell className="py-2.5">{parts.identity}</TableCell><TableCell>{parts.company}</TableCell>
              <TableCell>{parts.date}</TableCell>
              {report.view === "charges" && <TableCell>{parts.due}</TableCell>}
              {report.view !== "statement" && <TableCell>{row.status}</TableCell>}
              <TableCell className="whitespace-normal text-sm">{movementOriginLabel(row.origin)}</TableCell>
              {showBalance && <TableCell>{row.balance ? parts.balance : <span className="text-xs text-muted-foreground">—</span>}</TableCell>}
              <TableCell>{parts.amount}</TableCell><TableCell className="text-right">{parts.open}</TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
      </div>
      <ul aria-label={view.label + " · Movimentações Pix"} className="min-w-0 divide-y divide-border xl:hidden">
        {rows.map(row => {
          const parts = movementCells(row, open, filter);
          return <li key={row.key} className="grid min-w-0 gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2">{parts.identity}{parts.open}</div>
            <div className="grid min-w-0 grid-cols-2 items-start gap-3">{parts.company}{parts.amount}</div>
            {showBalance && row.balance && parts.balance}
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span>{parts.date}</span>
                <span className="text-xs text-muted-foreground">Origem {movementOriginLabel(row.origin)}</span>
                {report.view === "charges" && <span className="text-xs text-muted-foreground">Vencimento {parts.due}</span>}
              </div>
              {row.status}
            </div>
          </li>;
        })}
      </ul>
    </>
  );
}

function movementCells(row: MovementRow, open: OpenMovement, filter: FilterByScope) {
  const Icon = row.icon;
  const date = formatDateTime(row.date, "date-only");
  return {
    balance: row.balance && <dl className="grid min-w-0 gap-1 tabular-nums">
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <dt className="text-xs text-muted-foreground">Antes</dt><dd><PanelAmount cents={BigInt(row.balance.beforeInCents)} /></dd>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <dt className="text-xs text-muted-foreground">Depois</dt><dd><PanelAmount cents={BigInt(row.balance.afterInCents)} /></dd>
      </div>
    </dl>,
    identity: <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon aria-hidden="true" className="size-4" /></span>
      <div className="min-w-0">
        <p className="truncate font-medium" title={row.title}>{row.title}</p>
        <p className="truncate text-xs text-muted-foreground" title={row.subtitle}>{row.subtitle}</p>
      </div>
    </div>,
    company: <div className="min-w-0">
      <ScopeFilter label={row.company} id={row.companyId} onFilter={id => filter("companyId", id)} />
      {row.walletSuffix && <ScopeFilter label={"Carteira · " + row.walletSuffix} id={row.accountId} onFilter={id => filter("accountId", id)} secondary />}
    </div>,
    date: <span className="text-xs tabular-nums text-muted-foreground">
      <time dateTime={row.dateOnly ? date.split("/").reverse().join("-") : row.date}>{row.dateOnly ? date : formatDateTime(row.date)}</time>
      {row.registeredDate && <span className="block">Registro no Slopay</span>}
    </span>,
    due: <span className="text-xs tabular-nums text-muted-foreground">{row.due ? formatDateTime(row.due, "date-only") : "—"}</span>,
    amount: <div className="min-w-0 text-right tabular-nums">
      <p className="wrap-anywhere font-semibold"><PanelAmount cents={row.amount} showSign={row.signed} /></p>
      {row.fee != null && <p className="wrap-anywhere text-xs text-muted-foreground">Tarifa <PanelAmount cents={row.fee} /></p>}
    </div>,
    open: <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      aria-label={"Ver detalhes de " + row.title + " " + row.detail.id.slice(0, 8)}
      onClick={event => open(row.detail, event.currentTarget)}><ChevronRight aria-hidden="true" /></Button>,
  };
}

function ScopeFilter({ label, id, onFilter, secondary = false }: {
  label: string; id: string | null; onFilter: (id: string) => void; secondary?: boolean;
}) {
  const typography = secondary ? "text-xs tabular-nums text-muted-foreground" : "text-sm font-medium";
  if (!id) return <p title={label} className={"truncate " + typography}>{label}</p>;
  return <Button type="button" variant="link" size="sm" className={"block h-auto min-h-11 max-w-full truncate p-0 text-left xl:min-h-6 " + typography}
    title={label} aria-label={"Filtrar por " + label} onClick={() => onFilter(id)}>{label}</Button>;
}

async function exportStatement(query: GlobalStatementQuery) {
  const { pagination, items } = await exportGlobalStatement(query);
  if (pagination.page !== query.page || !items.length) throw new Error("A página mudou. Confira os resultados antes de exportar.");
  const columns = ["ID da transação", "Lançamento", "Operação Pix", "Empresa", "Carteira (final)", "Origem", "Data e hora (Brasília)", "Origem da data", "Valor (BRL)"];
  downloadAdminCsv("extrato-global-pagina-" + query.page + ".csv", columns, items.map(item => [
    item.transactionId, statementTypeLabels[item.type], pixKindLabels[item.kind], item.company, item.walletSuffix, movementOriginLabel(item.origin),
    formatDateTime(item.occurredAt, item.dateOnly ? "date-only" : "medium"),
    item.dateSource === "SETTLED" ? "Efetivação" : "Registro no Slopay", { cents: item.amountInCents },
  ]));
}

export function AdminPixMovementsScreen({ user }: { user: AdminIdentity }) {
  const { can } = useAdminAccess();
  const params = useSearchParams();
  const query = pixMovementQueryFrom(params);
  const selection = pixMovementSelection(params);
  const filterKey = pixMovementHref({ ...query, page: 1 });
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const development = useDevelopmentFeatures();
  const result = useQuery({
    queryKey: ["admin-pix-movements", user.id, filterKey, query.page],
    queryFn: ({ signal }) => fetchPixMovements(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === filterKey ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const report = denied ? undefined : result.data;
  const displayed = { ...query, page: report?.pagination.page ?? query.page };
  const view = views[query.view];
  const exportDisabled = !report?.items.length || result.isPlaceholderData || result.isError;

  function navigate(next: PixMovementQuery) {
    window.history.replaceState(null, "", pixMovementHref(next));
  }

  function changeView(value: string) {
    const href = pixMovementHref(pixMovementViewQuery(pixMovementView.parse(value), query));
    if (href !== window.location.pathname + window.location.search) window.history.pushState(null, "", href);
  }

  function open(item: PixTransactionId) {
    const href = pixMovementHref(displayed, item);
    if (selection) window.history.replaceState({ pixMovementDetail: Boolean(window.history.state?.pixMovementDetail) }, "", href);
    else window.history.pushState({ pixMovementDetail: true }, "", href);
  }

  function close() {
    if (window.history.state?.pixMovementDetail) window.history.back();
    else navigate(displayed);
  }

  const filterByScope: FilterByScope = (scope, value) => {
    navigate({ ...query, [scope]: value, page: 1 });
  };

  return (
    <>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Movimentações Pix</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Consulte operações, vencimentos e lançamentos liquidados.</p>
      </header>
      <Tabs value={query.view} activationMode="manual" onValueChange={changeView} className="grid min-w-0 gap-4">
        <TabsList aria-label="Visão das movimentações" className="grid h-auto w-full grid-cols-3 sm:w-fit">
          {pixMovementView.options.map(value => <TabsTrigger key={value} value={value} className="min-h-11 px-3">{views[value].label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={query.view} className="mt-0 grid min-w-0 gap-4">
          {(result.isPending || report) && <MovementSummary report={report} loading={result.isPending} />}
          <Card className="min-w-0 gap-0 overflow-hidden py-0" aria-labelledby="pix-movement-list">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <h2 id="pix-movement-list" className="text-balance text-lg font-semibold">{query.view === "all" ? "Operações" : view.label}</h2>
                <p className="text-pretty text-sm text-muted-foreground">{view.period} no horário de Brasília.{query.view === "statement" && " Tarifas aparecem em linhas próprias."}</p>
              </div>
              {can("admin.movements.export") && displayed.view === "all" && <PixTransactionExport query={displayed} disabled={exportDisabled} onRefresh={() => void result.refetch()} />}
              {can("admin.movements.export") && displayed.view === "statement" && <AdminCsvExport page={displayed.page} disabled={exportDisabled}
                description="O CSV inclui os lançamentos desta página com os filtros atuais."
                onExport={() => exportStatement(displayed)} onRefresh={() => void result.refetch()} />}
            </div>
            <MovementFilters adminId={user.id} query={query} onChange={navigate} />
            {result.isPending && <p role="status" className="sr-only">Carregando movimentações</p>}
            <ToastNotice message={result.error?.message} />
            <SkeletonReveal flow revealed={!result.isPending} skeleton={<div className="divide-y divide-border">
              {[1, 2, 3, 4].map(line => <div key={line} className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
                <Skeleton className="size-9 shrink-0 animate-none" /><Skeleton className="h-4 w-2/5 animate-none" />
                <Skeleton className="ml-auto h-4 w-1/5 animate-none" />
              </div>)}
            </div>}>
              {report?.items.length ? (
                <>
                  <MovementTable report={report} filter={filterByScope} open={(item, button) => { trigger.current = button; open(item); }} />
                  <TablePagination {...report.pagination} busy={result.isPlaceholderData || result.isFetching}
                    label="Paginação das movimentações Pix" onPageChange={page => navigate({ ...query, page })} />
                </>
              ) : (report || result.isError) && (
                <div className="grid min-h-44 content-center justify-items-center gap-3 px-5 py-6 text-center">
                  <h3 className="text-balance text-base font-semibold">{result.isError ? "Não foi possível consultar esta visão" : "Nenhum registro para os filtros selecionados"}</h3>
                  {report && query.period !== "ALL"
                    ? <Button type="button" variant="outline" className="h-11" onClick={() => navigate({ ...query, period: "ALL", page: 1 })}>Consultar todo o período</Button>
                    : <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>{result.isError ? "Tentar novamente" : "Atualizar consulta"}</Button>}
                </div>
              )}
            </SkeletonReveal>
          </Card>
        </TabsContent>
      </Tabs>
      <PixTransactionDialog adminId={user.id} selection={denied ? undefined : selection} onClose={close} onOpen={open}
        onScope={(scope, value) => {
          trigger.current = null;
          filterByScope(scope, value);
        }}
        onRestoreFocus={() => {
          const control = trigger.current;
          (control?.getClientRects().length ? control : heading.current)?.focus({ preventScroll: true });
          trigger.current = null;
        }} />
    </>
  );
}
