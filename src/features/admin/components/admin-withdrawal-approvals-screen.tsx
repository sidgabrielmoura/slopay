"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
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
import { pixStatusLabels, pixTransactionsPath } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import {
  adminApprovalHref, adminApprovalQuery, adminApprovalQueryFrom, adminApprovalSearch,
  adminWithdrawalApprovals, approvalStates, type AdminApprovalQuery, type AdminApprovalSummary, type AdminWithdrawalApproval,
} from "../admin-withdrawal-approvals";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";
import { WithdrawalApprovalPolicy } from "./withdrawal-approval-policy";
import { CompanyReadError } from "./company-display";

const number = new Intl.NumberFormat("pt-BR");
const initialQuery = adminApprovalQuery.parse({});
const statusOptions = adminApprovalQuery.shape.status.unwrap().options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : approvalStates[value].label,
}));
const periodOptions = adminDatePeriod.options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));

function ApprovalFilters({ query, onChange }: { query: AdminApprovalQuery; onChange: (query: AdminApprovalQuery) => void }) {
  const [draft, setDraft] = useState({ submitted: query.search, value: query.search });
  const search = draft.submitted === query.search ? draft.value : query.search;
  const filtered = query.search || query.status !== initialQuery.status || query.period !== initialQuery.period;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = adminApprovalSearch.safeParse(search);
    if (!value.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ submitted: value.data, value: value.data });
    onChange({ ...query, search: value.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar solicitações de saque" className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5" onSubmit={submit}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="approval-search" className="text-sm font-medium">Buscar solicitação</label>
          <div className="flex min-w-0 gap-2">
            <Input id="approval-search" type="search" className="h-11 min-w-0" placeholder="Empresa, titular, CNPJ ou ID"
              autoComplete="off" maxLength={120} value={search} onChange={(event) => setDraft({ submitted: query.search, value: event.target.value })} />
            <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar solicitação"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="approval-decision-filter" className="text-sm font-medium">Decisão do titular</span>
          <GlideSelect aria-labelledby="approval-decision-filter" options={statusOptions} value={query.status} size="lg" menuWidth={224}
            onChange={(value) => onChange({ ...query, status: adminApprovalQuery.shape.status.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="approval-period-filter" className="text-sm font-medium">Período da solicitação</span>
          <GlideSelect aria-labelledby="approval-period-filter" options={periodOptions} value={query.period} size="lg"
            onChange={(value) => onChange({ ...query, period: adminDatePeriod.parse(value), page: 1 })} />
        </div>
      </div>
      {filtered && <Button type="button" variant="ghost" size="sm" className="-ml-2 h-11 w-fit" onClick={() => {
        setDraft({ submitted: "", value: "" });
        onChange(initialQuery);
      }}>Restaurar filtros</Button>}
    </form>
  );
}

function ApprovalSummary({ summary, loading }: { summary?: AdminApprovalSummary; loading: boolean }) {
  const cells = [
    { decision: "PENDING", label: "Aguardando titular", count: summary?.pendingCount },
    { decision: "APPROVED", label: "Autorizadas", count: summary?.approvedCount },
    { decision: "REJECTED", label: "Recusadas", count: summary?.rejectedCount },
    { decision: "CLOSED", label: "Encerradas sem decisão", count: summary?.closedCount },
  ] as const;
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";

  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>{cells.map(({ decision }) => (
        <div key={decision} className="grid min-h-24 min-w-0 content-start gap-2.5 bg-card p-4 sm:p-5">
          <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-10 animate-none" />
          {decision === "PENDING" && <Skeleton className="h-3 w-24 max-w-full animate-none" />}
        </div>
      ))}</div>
    }>
      {summary && <dl className={grid} aria-label="Resumo de todas as decisões no período e na busca">
        {cells.map(({ decision, label, count }) => (
          <div key={decision} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
            <dt className="text-pretty text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{number.format(count ?? 0)}</dd>
            {decision === "PENDING" && <dd className="wrap-anywhere text-xs tabular-nums text-muted-foreground"><PanelAmount cents={summary.pendingCents} /> em espera</dd>}
          </div>
        ))}
      </dl>}
    </SkeletonReveal>
  );
}

function ApprovalDecisionBadge({ decision }: Pick<AdminWithdrawalApproval, "decision">) {
  const { label, variant } = approvalStates[decision];
  return <Badge variant={variant} className="max-w-full whitespace-normal">{label}</Badge>;
}

function ApprovalLink({ approval, query }: { approval: AdminWithdrawalApproval; query: AdminApprovalQuery }) {
  return (
    <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground">
      <Link href={adminApprovalHref(query, approval.id)} prefetch={false} aria-label={`Ver solicitação ${approval.id.slice(0, 8)} de ${approval.company}`}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

function ApprovalCompany({ approval }: { approval: AdminWithdrawalApproval }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium" title={approval.company}>{approval.company}</p>
      <p className="truncate text-xs text-muted-foreground" title={approval.ownerName}>{approval.ownerName}</p>
    </div>
  );
}

function ApprovalRows({ approvals, query }: { approvals: AdminWithdrawalApproval[]; query: AdminApprovalQuery }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Solicitações de saque via API" className="table-fixed">
          <colgroup>
            <col className="w-[30%]" /><col className="w-[23%]" /><col className="w-[24%]" />
            <col className="w-[17%]" /><col className="w-[6%]" />
          </colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Empresa e titular</TableHead><TableHead scope="col">Solicitação</TableHead>
              <TableHead scope="col">Decisão do titular</TableHead><TableHead scope="col" className="text-right">Valor</TableHead>
              <TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{approvals.map((approval) => (
            <TableRow key={approval.id}>
              <TableCell className="py-3"><ApprovalCompany approval={approval} /></TableCell>
              <TableCell className="py-3">
                <time dateTime={approval.requestedAt} className="block text-xs tabular-nums">{formatDateTime(approval.requestedAt)}</time>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground" title={approval.id}>{approval.id.slice(0, 8)}</p>
              </TableCell>
              <TableCell className="py-3">
                <ApprovalDecisionBadge decision={approval.decision} />
                {approval.decision === "APPROVED" && <p className="mt-0.5 text-xs text-muted-foreground">{pixStatusLabels[approval.execution]}</p>}
              </TableCell>
              <TableCell className="wrap-anywhere py-3 text-right font-semibold tabular-nums"><PanelAmount cents={approval.amountInCents} /></TableCell>
              <TableCell className="px-1 py-2 text-right"><ApprovalLink approval={approval} query={query} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Solicitações de saque via API" className="min-w-0 divide-y divide-border xl:hidden">
        {approvals.map((approval) => (
          <li key={approval.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <ApprovalCompany approval={approval} /><ApprovalLink approval={approval} query={query} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <time dateTime={approval.requestedAt} className="text-xs tabular-nums text-muted-foreground">{formatDateTime(approval.requestedAt)}</time>
              <p className="wrap-anywhere text-sm font-semibold tabular-nums"><PanelAmount cents={approval.amountInCents} /></p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <ApprovalDecisionBadge decision={approval.decision} />
              {approval.decision === "APPROVED" && <p className="text-xs text-muted-foreground">{pixStatusLabels[approval.execution]}</p>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function EmptyResults({ query, onChange }: { query: AdminApprovalQuery; onChange: (query: AdminApprovalQuery) => void }) {
  return (
    <div className="grid min-h-44 content-center justify-items-center gap-3 px-5 py-6 text-center">
      <h3 className="text-balance text-base font-semibold">{query.status === "PENDING" && !query.search && query.period === "ALL"
        ? "Nenhuma solicitação aguardando o titular" : "Nenhuma solicitação encontrada"}</h3>
      {query.search || query.period !== "ALL" ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => onChange({ ...initialQuery, status: "ALL" })}>Limpar busca e filtros</Button>
      ) : query.status !== "ALL" ? (
        <Button type="button" variant="outline" className="h-11" onClick={() => onChange({ ...query, status: "ALL", page: 1 })}>Ver todas as solicitações</Button>
      ) : (
        <Button asChild variant="outline" className="h-11"><Link href={pixTransactionsPath} prefetch={false}>Ver transações Pix</Link></Button>
      )}
    </div>
  );
}

export function AdminWithdrawalApprovalsScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const query = adminApprovalQueryFrom(useSearchParams());
  const filters = adminApprovalHref({ ...query, page: 1 });
  const result = useQuery({
    queryKey: ["admin-withdrawal-approvals", user.id, filters, query.page],
    queryFn: ({ signal }) => adminWithdrawalApprovals.list(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === filters ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = denied ? undefined : result.data;

  function navigate(next: AdminApprovalQuery) {
    window.history.replaceState(null, "", adminApprovalHref(next));
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Aprovações de saque</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Acompanhe as solicitações de saque via API e as decisões dos titulares.</p>
      </header>
      <WithdrawalApprovalPolicy channels={data?.channels} />
      {(result.isLoading || data) && <ApprovalSummary summary={data?.summary} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="withdrawal-approvals">
        <header className="px-4 py-4 sm:px-5">
          <h2 id="withdrawal-approvals" className="text-balance text-lg font-semibold">Solicitações de saque</h2>
        </header>
        <ApprovalFilters query={query} onChange={navigate} />
        {result.isLoading && <p role="status" className="sr-only">Carregando solicitações de saque</p>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3].map((row) => (
            <div key={row} className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {data ? data.items.length ? (
            <>
              <ApprovalRows approvals={data.items} query={{ ...query, page: data.pagination.page }} />
              <TablePagination {...data.pagination} label="Paginação de solicitações de saque" busy={result.isPlaceholderData}
                onPageChange={(page) => navigate({ ...query, page })} />
            </>
          ) : <EmptyResults query={query} onChange={navigate} />
            : result.isError && <CompanyReadError title="Não foi possível carregar as solicitações" retry={() => void result.refetch()} />}
        </SkeletonReveal>
      </Card>
    </AdminPanel>
  );
}
