"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Download, FileText, Search } from "lucide-react";
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
import { formatCNPJ } from "@/lib/validators";
import { openingStatus, openingStatusLabels } from "../account-openings";
import { adminDatePeriodLabels } from "../admin-date-period";
import { pixTransactionSearch } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import {
  adminReports, reportKind, reportKindLabels, reportPageHref, reportPeriod, reportQueryFrom, reportTitle,
  type ReportHistory, type ReportPreview, type ReportPreviewQuery, type ReportRecord, type ReportScope,
} from "../admin-reports";
import { ReportFileDialog, type ReportAction } from "./admin-report-dialog";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const number = new Intl.NumberFormat("pt-BR");
const kinds = reportKind.options.map((value) => ({ value, label: reportKindLabels[value] }));
const periods = reportPeriod.options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));
type Metric = { key: string; label: string };
const financial = [
  { key: "creditCents", label: "Créditos brutos" }, { key: "withdrawalCents", label: "Saques" },
  { key: "refundCents", label: "Estornos" }, { key: "feeCents", label: "Tarifas registradas" },
  { key: "netCents", label: "Líquido registrado" },
];
const fees = [
  { key: "receiveFeeCents", label: "Tarifas sobre créditos" }, { key: "withdrawalFeeCents", label: "Tarifas sobre saques" },
  { key: "feeCents", label: "Total registrado" }, { key: "feeMissingCount", label: "Operações sem tarifa registrada" },
];
const settlements = [
  { key: "receivedCount", label: "Recebimentos" }, { key: "withdrawnCount", label: "Saques" }, { key: "refundedCount", label: "Estornos" },
  { key: "settledCount", label: "Operações confirmadas" }, { key: "datedCount", label: "Com data de efetivação" },
];
const applications = [
  { key: "applicationCount", label: "Cadastros" }, { key: "approvedCount", label: "Aprovados" },
  { key: "reviewCount", label: "Na fila de análise" }, { key: "rejectedCount", label: "Recusados" },
];
const reportFields: Record<ReportScope["kind"], { summary: Metric[]; columns: Metric[]; note: string }> = {
  FINANCIAL: {
    summary: financial, columns: financial, note: "Créditos brutos menos saques, estornos e tarifas registradas.",
  },
  FEES: {
    summary: fees, columns: fees, note: "Tarifas registradas nos recebimentos e saques confirmados.",
  },
  SETTLEMENTS: {
    summary: [settlements[3], settlements[4]], columns: settlements,
    note: "Operações confirmadas, incluindo as que têm apenas a data de registro no Slopay.",
  },
  ONBOARDING: {
    summary: applications, columns: [applications[0]], note: "Situação atual dos cadastros iniciados no período.",
  },
};

function reportRange({ fromDate, throughDate }: Pick<ReportPreview, "fromDate" | "throughDate">) {
  return `${formatDateTime(fromDate, "date-only")} a ${formatDateTime(throughDate, "date-only")}`;
}

function ReportFilters({ query, onChange }: { query: ReportPreviewQuery; onChange: (query: ReportPreviewQuery) => void }) {
  const [draft, setDraft] = useState({ applied: query.search, value: query.search });
  const search = draft.applied === query.search ? draft.value : query.search;
  const input = useRef<HTMLInputElement>(null);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = pixTransactionSearch.safeParse(search);
    if (!parsed.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ applied: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtros do relatório" onSubmit={applySearch} className="grid min-w-0 gap-3 border-y border-border p-4 sm:p-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid min-w-0 gap-2">
          <span id="report-kind" className="text-sm font-medium">Relatório</span>
          <GlideSelect aria-labelledby="report-kind" size="lg" options={kinds} value={query.kind}
            onChange={(kind) => onChange({ ...query, kind: reportKind.parse(kind), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="report-period" className="text-sm font-medium">Período</span>
          <GlideSelect aria-labelledby="report-period" size="lg" options={periods} value={query.period}
            onChange={(period) => onChange({ ...query, period: reportPeriod.parse(period), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="report-search" className="text-sm font-medium">Empresa</label>
          <div className="flex min-w-0 gap-2">
            <Input id="report-search" ref={input} type="search" maxLength={120} autoComplete="off" className="h-11 min-w-0"
              placeholder="Todas as empresas · nome ou CNPJ" value={search}
              onChange={(event) => setDraft({ applied: query.search, value: event.target.value })} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar empresa"><Search aria-hidden="true" /></Button>
          </div>
        </div>
      </div>
      {query.search && <Button type="button" variant="ghost" size="sm" className="-ml-2 h-11 w-fit" onClick={() => {
        input.current?.focus();
        setDraft({ applied: "", value: "" });
        onChange({ ...query, search: "", page: 1 });
      }}>Limpar busca</Button>}
    </form>
  );
}

function ReportValue({ metric, values }: { metric: Metric; values: ReportPreview["summary"] }) {
  const value = values[metric.key];
  if (value == null) return <span aria-label="Sem registro" className="text-muted-foreground">—</span>;
  return metric.key.endsWith("Cents")
    ? <PanelAmount cents={BigInt(value)} showSign={metric.key === "netCents"} />
    : number.format(BigInt(value));
}

function ReportRows({ items, kind, columns }: { items: ReportPreview["items"]; kind: ReportScope["kind"]; columns: Metric[] }) {
  const heading = kind === "ONBOARDING" ? "Cadastros por situação" : "Dados por empresa";
  function identity(item: ReportPreview["items"][number]) {
    const status = openingStatus.safeParse(item.label);
    const label = kind === "ONBOARDING" && status.success ? openingStatusLabels[status.data] : item.label;
    return (
      <div className="min-w-0 space-y-0.5">
        <p className="truncate font-medium" title={label}>{label}</p>
        {item.cnpj && <p className="text-xs tabular-nums text-muted-foreground">{formatCNPJ(item.cnpj)}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label={heading} className="table-fixed">
          <colgroup><col className="w-1/4" />{columns.map(({ key }) => <col key={key} />)}</colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">{kind === "ONBOARDING" ? "Situação" : "Empresa"}</TableHead>
              {columns.map(({ key, label }) => <TableHead key={key} scope="col" className="h-auto whitespace-normal py-3 text-right">{label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-3">{identity(item)}</TableCell>
              {columns.map((metric) => <TableCell key={metric.key} className="wrap-anywhere text-right tabular-nums">
                <ReportValue metric={metric} values={item.values} />
              </TableCell>)}
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label={heading} className="min-w-0 divide-y divide-border xl:hidden">{items.map((item) => (
        <li key={item.id} className="grid gap-3 px-4 py-4 sm:px-5">
          {identity(item)}
          <dl className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            {columns.map((metric) => <div key={metric.key} className="min-w-0">
              <dt className="text-pretty text-xs text-muted-foreground">{metric.label}</dt>
              <dd className="mt-0.5 wrap-anywhere text-sm font-medium tabular-nums"><ReportValue metric={metric} values={item.values} /></dd>
            </div>)}
          </dl>
        </li>
      ))}</ul>
    </>
  );
}

function ReportDataset({ data, query, busy, onChange }: {
  data: ReportPreview; query: ReportPreviewQuery; busy: boolean; onChange: (query: ReportPreviewQuery) => void;
}) {
  const fields = reportFields[query.kind];
  const metrics = fields.summary;
  const otherPeriod = query.period === "LAST_30_DAYS" ? "LAST_MONTH" : "LAST_30_DAYS";
  return (
    <>
      <div className="grid min-w-0 gap-4 p-4 sm:p-5">
        <div className="space-y-1">
          <h3 className="text-balance text-lg font-semibold">{reportTitle(query)}</h3>
          <p className="text-pretty text-xs tabular-nums text-muted-foreground">{reportRange(data)} · Horário de Brasília</p>
        </div>
        {data.items.length > 0 && (
          <>
            <dl aria-label="Totais do relatório" className="flex flex-wrap gap-px overflow-hidden rounded-lg border border-border bg-border">
              {metrics.map((metric) => <div key={metric.key} className="min-w-0 basis-[calc(50%-1px)] grow space-y-1 bg-card p-3 sm:p-4 xl:basis-0">
                <dt className="text-pretty text-xs text-muted-foreground">{metric.label}</dt>
                <dd className="wrap-anywhere text-lg font-semibold tabular-nums sm:text-xl"><ReportValue metric={metric} values={data.summary} /></dd>
              </div>)}
            </dl>
            <p className="text-pretty text-xs text-muted-foreground">{fields.note}</p>
          </>
        )}
      </div>
      {data.items.length ? (
        <>
          <div className="border-t border-border"><ReportRows items={data.items} kind={query.kind} columns={fields.columns} /></div>
          <TablePagination {...data.pagination} busy={busy} label="Paginação da prévia"
            onPageChange={(page) => onChange({ ...query, page })} />
        </>
      ) : (
        <div className="grid min-h-32 content-center justify-items-center gap-3 border-t border-border p-4 text-center">
          <h3 className="text-balance text-sm font-semibold">Nenhum registro para este recorte</h3>
          <Button type="button" variant="outline" className="h-11" onClick={() => onChange({
            ...query, search: "", period: query.search ? query.period : otherPeriod, page: 1,
          })}>{query.search ? "Consultar todas as empresas" : `Consultar ${adminDatePeriodLabels[otherPeriod].toLowerCase()}`}</Button>
        </div>
      )}
    </>
  );
}

type DownloadReport = (report: ReportRecord, trigger: HTMLButtonElement) => void;

function DownloadButton({ report, onDownload }: { report: ReportRecord; onDownload: DownloadReport }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      aria-label={`Baixar ${reportTitle(report)} de ${formatDateTime(report.createdAt)}`}
      onClick={(event) => onDownload(report, event.currentTarget)}><Download aria-hidden="true" /></Button>
  );
}

function ReportRunTitle({ report }: { report: ReportRecord }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-pretty text-sm font-medium">{reportTitle(report)}</p>
      <p className="truncate text-xs text-muted-foreground" title={report.search || undefined}>{report.search || "Todas as empresas"}</p>
    </div>
  );
}

function HistoryRows({ data, onDownload }: { data: ReportHistory; onDownload: DownloadReport }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Relatórios emitidos" className="table-fixed">
          <colgroup><col className="w-[27%]" /><col className="w-[25%]" /><col className="w-[21%]" /><col className="w-[21%]" /><col className="w-[6%]" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Relatório</TableHead><TableHead scope="col">Período</TableHead>
              <TableHead scope="col">Emitido em</TableHead><TableHead scope="col">Emitido por</TableHead>
              <TableHead scope="col"><span className="sr-only">Baixar arquivo</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{data.items.map((report) => <TableRow key={report.id}>
            <TableCell className="py-3"><ReportRunTitle report={report} /></TableCell>
            <TableCell className="text-xs tabular-nums">{reportRange(report)}</TableCell>
            <TableCell className="text-xs tabular-nums"><time dateTime={report.createdAt}>{formatDateTime(report.createdAt)}</time></TableCell>
            <TableCell className="truncate text-sm text-muted-foreground" title={report.generatedBy}>{report.generatedBy}</TableCell>
            <TableCell className="px-1 py-2 text-right"><DownloadButton report={report} onDownload={onDownload} /></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>
      <ul aria-label="Relatórios emitidos" className="min-w-0 divide-y divide-border xl:hidden">{data.items.map((report) => (
        <li key={report.id} className="grid min-w-0 gap-2 p-4 sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2"><ReportRunTitle report={report} /><DownloadButton report={report} onDownload={onDownload} /></div>
          <p className="text-xs tabular-nums text-muted-foreground">{reportRange(report)}</p>
          <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <time dateTime={report.createdAt} className="tabular-nums">{formatDateTime(report.createdAt)}</time>
            <span className="wrap-anywhere">{report.generatedBy}</span>
          </div>
        </li>
      ))}</ul>
    </>
  );
}

function ReportSkeleton({ preview = false }: { preview?: boolean }) {
  return (
    <div className="grid gap-3 p-4 sm:p-5">
      {preview && <><Skeleton className="h-5 w-44 animate-none" /><Skeleton className="h-20 w-full animate-none" /></>}
      {[1, 2, 3].map((row) => <div key={row} className="flex h-10 items-center justify-between gap-3">
        <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="h-4 w-1/5 animate-none" />
      </div>)}
    </div>
  );
}

function ReadError({ label, retry }: { label: string; retry: () => void }) {
  return (
    <div className="grid min-h-36 content-center justify-items-center gap-3 px-5 py-6 text-center">
      <h3 className="text-balance text-sm font-semibold">{label}</h3>
      <Button type="button" variant="outline" className="h-11" onClick={retry}>Tentar novamente</Button>
    </div>
  );
}

function accessDenied(error: Error | null) {
  return error instanceof ApiError && [401, 403].includes(error.status);
}

export function AdminReportsScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const { historyPage, ...query } = reportQueryFrom(useSearchParams());
  const historyKey = ["admin-report-history", user.id] as const;
  const scope = reportPageHref({ ...query, page: 1 }, 1);
  const client = useQueryClient();
  const [action, setAction] = useState<ReportAction>();
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLButtonElement>(null);
  const preview = useQuery({
    queryKey: ["admin-report-preview", user.id, scope, query.page],
    queryFn: ({ signal }) => adminReports.preview(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === scope ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const history = useQuery({
    queryKey: [...historyKey, historyPage],
    queryFn: ({ signal }) => adminReports.history(historyPage, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const denied = accessDenied(preview.error) || accessDenied(history.error);
  const data = denied ? undefined : preview.data;
  const records = denied ? undefined : history.data;

  function navigate(next: ReportPreviewQuery, nextHistoryPage = historyPage) {
    window.history.replaceState(null, "", reportPageHref(next, nextHistoryPage));
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Relatórios e Fechamentos</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Confira os dados por período e consulte as versões emitidas.</p>
      </header>
      <ToastNotice message={preview.error?.message ?? history.error?.message} />
      <Card className="min-w-0" aria-labelledby="report-preview">
        <header className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
          <h2 id="report-preview" className="text-balance text-lg font-semibold">Prévia do relatório</h2>
          <Button type="button" className="h-11" disabled={!data?.items.length || preview.isError || preview.isPlaceholderData} onClick={(event) => {
            if (!data) return;
            const { kind, period, search } = query;
            const { fromDate, throughDate } = data;
            origin.current = event.currentTarget;
            setAction({ type: "issue", report: { requestId: crypto.randomUUID(), kind, period, search, fromDate, throughDate } });
          }}><FileText aria-hidden="true" /> Emitir CSV</Button>
        </header>
        <ReportFilters query={query} onChange={navigate} />
        {preview.isLoading && <p role="status" className="sr-only">Carregando prévia do relatório</p>}
        <SkeletonReveal flow revealed={!preview.isLoading} skeleton={<ReportSkeleton preview />}>
          {data ? <ReportDataset data={data} query={query} busy={preview.isPlaceholderData} onChange={navigate} />
            : (preview.isError || denied) && <ReadError label="Não foi possível consultar a prévia" retry={() => void preview.refetch()} />}
        </SkeletonReveal>
      </Card>

      <Card className="min-w-0" aria-labelledby="report-history">
        <header className="border-b border-border p-4 sm:px-5">
          <h2 id="report-history" className="text-balance text-lg font-semibold">Relatórios emitidos</h2>
        </header>
        {history.isLoading && <p role="status" className="sr-only">Carregando relatórios emitidos</p>}
        <SkeletonReveal flow revealed={!history.isLoading} skeleton={<ReportSkeleton />}>
          {records?.items.length ? (
            <>
              <HistoryRows data={records} onDownload={(report, trigger) => {
                origin.current = trigger;
                setAction({ type: "download", report });
              }} />
              <TablePagination {...records.pagination} busy={history.isPlaceholderData} label="Paginação das emissões"
                onPageChange={(page) => navigate(query, page)} />
            </>
          ) : records ? (
            <p className="p-4 text-pretty text-sm text-muted-foreground sm:px-5">As emissões aparecerão aqui após a confirmação.</p>
          ) : (history.isError || denied) && <ReadError label="Não foi possível consultar o histórico" retry={() => void history.refetch()} />}
        </SkeletonReveal>
      </Card>
      {action && <ReportFileDialog action={action} onClose={() => setAction(undefined)} onIssue={() => {
        navigate(query, 1);
        void client.invalidateQueries({ queryKey: historyKey });
      }} onRestoreFocus={() => {
        const control = origin.current;
        (control?.getClientRects().length ? control : heading.current)?.focus({ preventScroll: true });
        origin.current = null;
      }} />}
    </AdminPanel>
  );
}
