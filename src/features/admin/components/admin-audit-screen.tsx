"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import {
  adminAudit, adminAuditHref, adminAuditQuery, adminAuditQueryFrom, auditActorRoles,
  auditCategoryFilter, auditCategoryLabels, auditOutcomeFilter, auditOutcomeLabels,
  type AdminAuditEntry, type AdminAuditQuery,
} from "../admin-audit";
import { adminDatePeriod, adminDatePeriodLabels } from "../admin-date-period";
import { operationalSearch } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { AdminDetailsDialog } from "./admin-details-dialog";
import { CompanyField, CompanyReadError } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const initialQuery = adminAuditQuery.parse({});
const periods = adminDatePeriod.options.map((value) => ({ value, label: adminDatePeriodLabels[value] }));
const categories = auditCategoryFilter.options.map((value) => ({ value, label: auditCategoryLabels[value] }));
const outcomes = auditOutcomeFilter.options.map((value) => ({ value, label: auditOutcomeLabels[value] }));
const outcomeVariants = { COMPLETED: "success", ALERT: "warning", RECORDED: "secondary" } as const;

function retryAuditRead(failures: number, error: Error) {
  return retryAdminRead(failures, error) || (failures === 0 && error instanceof ApiError && error.status === 429);
}

function AuditFilters({ query, onChange }: { query: AdminAuditQuery; onChange: (query: AdminAuditQuery) => void }) {
  const development = useDevelopmentFeatures();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ submitted: query.search, value: query.search });
  const search = draft.submitted === query.search ? draft.value : query.search;
  const filtered = adminAuditHref({ ...query, page: 1 }) !== adminAuditHref(initialQuery);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = operationalSearch.safeParse(search);
    if (!checked.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ submitted: checked.data, value: checked.data });
    onChange({ ...query, search: checked.data, page: 1 });
  }

  function reset() {
    setDraft({ submitted: "", value: "" });
    onChange(initialQuery);
    input.current?.focus();
  }

  return (
    <form role="search" aria-label="Filtrar eventos de auditoria" onSubmit={submit} className="grid gap-3 border-y border-border px-4 py-4 sm:px-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2">
          <label htmlFor="audit-search" className="text-sm font-medium">Buscar evento</label>
          <div className="flex min-w-0 gap-2">
            <Input id="audit-search" ref={input} type="search" className="h-11 min-w-0" placeholder="Nome, evento ou ID do registro"
              autoComplete="off" maxLength={120} value={search} onChange={(event) => setDraft({ submitted: query.search, value: event.target.value })} />
            <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar evento"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="audit-period" className="text-sm font-medium">Período</span>
          <GlideSelect aria-labelledby="audit-period" size="lg" value={query.period} options={periods} menuWidth={208}
            onChange={(period) => onChange({ ...query, period: adminDatePeriod.parse(period), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="audit-category" className="text-sm font-medium">Módulo</span>
          <GlideSelect aria-labelledby="audit-category" size="lg" value={query.category}
            options={development ? categories : categories.filter(({ value }) => value !== "PIX")} menuWidth={220}
            onChange={(category) => onChange({ ...query, category: auditCategoryFilter.parse(category), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="audit-outcome" className="text-sm font-medium">Resultado</span>
          <GlideSelect aria-labelledby="audit-outcome" size="lg" value={query.outcome} options={outcomes} menuWidth={206}
            onChange={(outcome) => onChange({ ...query, outcome: auditOutcomeFilter.parse(outcome), page: 1 })} />
        </div>
      </div>
      {filtered && <Button type="button" variant="ghost" className="h-11 w-fit" onClick={reset}>Limpar filtros</Button>}
    </form>
  );
}

function AuditActor({ actor }: { actor: AdminAuditEntry["actor"] }) {
  return actor ? <div className="min-w-0 space-y-0.5">
    <p className="wrap-anywhere text-sm font-medium">{actor.name}</p>
    <p className="text-xs text-muted-foreground">{auditActorRoles[actor.role]}</p>
  </div> : <span className="text-sm text-muted-foreground">Autor indisponível</span>;
}

function AuditOutcome({ outcome }: { outcome: AdminAuditEntry["outcome"] }) {
  return <Badge variant={outcomeVariants[outcome]} className="w-fit">{auditOutcomeLabels[outcome]}</Badge>;
}

function EventIdentity({ entry }: { entry: AdminAuditEntry }) {
  return <div className="min-w-0 space-y-0.5">
    <p className="text-pretty text-sm font-semibold">{entry.label}</p>
    <p className="text-xs text-muted-foreground">{auditCategoryLabels[entry.category]}</p>
  </div>;
}

type OpenEvent = (id: string, trigger: HTMLButtonElement) => void;

function EventButton({ entry, openEvent }: { entry: AdminAuditEntry; openEvent: OpenEvent }) {
  return <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground" aria-haspopup="dialog"
    aria-label={`Ver evento ${entry.label} de ${formatDateTime(entry.createdAt)}`} onClick={(event) => openEvent(entry.id, event.currentTarget)}>
    <ChevronRight aria-hidden="true" />
  </Button>;
}

function AuditRows({ entries, openEvent }: { entries: AdminAuditEntry[]; openEvent: OpenEvent }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Eventos de auditoria" className="table-fixed">
          <colgroup><col className="w-1/3" /><col className="w-1/4" /><col className="w-1/6" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Evento</TableHead>
              <TableHead scope="col">Responsável</TableHead>
              <TableHead scope="col">Resultado</TableHead>
              <TableHead scope="col">Data e hora</TableHead>
              <TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="py-3 pl-5"><EventIdentity entry={entry} /></TableCell>
              <TableCell className="py-3"><AuditActor actor={entry.actor} /></TableCell>
              <TableCell className="py-3"><AuditOutcome outcome={entry.outcome} /></TableCell>
              <TableCell className="whitespace-normal py-3 text-sm tabular-nums"><time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time></TableCell>
              <TableCell className="px-2 py-2 text-right"><EventButton entry={entry} openEvent={openEvent} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Eventos de auditoria" className="min-w-0 divide-y divide-border xl:hidden">
        {entries.map((entry) => <li key={entry.id} className="grid min-w-0 gap-2 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2"><EventIdentity entry={entry} /><EventButton entry={entry} openEvent={openEvent} /></div>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><AuditActor actor={entry.actor} /><AuditOutcome outcome={entry.outcome} /></div>
          <time dateTime={entry.createdAt} className="text-xs text-muted-foreground tabular-nums">{formatDateTime(entry.createdAt)}</time>
        </li>)}
      </ul>
    </>
  );
}

function AuditRowsSkeleton() {
  return <div className="divide-y divide-border">{[1, 2, 3, 4].map((index) => (
    <div key={index} className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-5">
      <div className="w-2/5 space-y-2"><Skeleton className="h-4 w-full animate-none" /><Skeleton className="h-3 w-2/3 animate-none" /></div>
      <Skeleton className="h-5 w-24 max-w-1/3 animate-none" />
    </div>
  ))}</div>;
}

const supportStatus = { ACTIVE: "Em andamento", ENDED: "Encerrado", EXPIRED: "Expirado" } as const;

function supportDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}

function AuditEventDialog({ id, userId, open, onOpenChange, onCloseAutoFocus }: {
  id: string; userId: string; open: boolean; onOpenChange: (open: boolean) => void; onCloseAutoFocus: (event: Event) => void;
}) {
  const result = useQuery({ queryKey: ["admin-audit-event", userId, id],
    queryFn: ({ signal }) => adminAudit.event(id, signal), staleTime: 15_000, retry: retryAuditRead, retryDelay: 1_250 });
  const status = result.error instanceof ApiError ? result.error.status : undefined;
  const event = status && [401, 403, 404].includes(status) ? undefined : result.data;

  return (
    <AdminDetailsDialog open={open} onOpenChange={onOpenChange} onCloseAutoFocus={onCloseAutoFocus}
      title="Detalhes do evento" description="Registro da trilha de auditoria do Slopay.">
      <ToastNotice message={result.error?.message} />
      {result.isPending && <span role="status" className="sr-only">Carregando evento de auditoria</span>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={<AuditRowsSkeleton />}>
        {event ? (
          <div className="grid min-w-0 gap-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><EventIdentity entry={event} /><AuditOutcome outcome={event.outcome} /></div>
            <dl className="grid min-w-0 gap-x-5 gap-y-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
              <CompanyField label="Responsável"><AuditActor actor={event.actor} /></CompanyField>
              <CompanyField label="Data e hora"><time dateTime={event.createdAt} className="tabular-nums">
                {formatDateTime(event.createdAt, "date-only")} às {formatDateTime(event.createdAt, "time-only")}
              </time></CompanyField>
              <CompanyField label="Tipo de evento"><code className="wrap-anywhere text-xs">{event.eventType}</code></CompanyField>
              {event.environment && <CompanyField label="Ambiente">{event.environment === "SANDBOX" ? "Sandbox" : "Produção"}</CompanyField>}
              {event.change && <CompanyField label="Alteração">{event.change}</CompanyField>}
              {event.support && <>
                <CompanyField label="Sessão de suporte">{supportStatus[event.support.status]}</CompanyField>
                <CompanyField label="Duração registrada"><span className="tabular-nums">{supportDuration(event.support.durationSeconds)}</span></CompanyField>
                <CompanyField label="Início"><time dateTime={event.support.startedAt}>{formatDateTime(event.support.startedAt, "medium")}</time></CompanyField>
                <CompanyField label="Término">{event.support.endedAt ? <time dateTime={event.support.endedAt}>
                  {formatDateTime(event.support.endedAt, "medium")}
                </time> : "—"}</CompanyField>
                {!event.actor && <CompanyField label="ID do superadmin"><code className="wrap-anywhere text-xs">{event.support.adminId}</code></CompanyField>}
              </>}
              <CompanyField label="ID do registro" className="sm:col-span-2"><code className="wrap-anywhere text-xs">{event.id}</code></CompanyField>
              {event.target && <CompanyField label={event.target.label} className="sm:col-span-2"><code className="wrap-anywhere text-xs">{event.target.id}</code></CompanyField>}
              {event.reason && <CompanyField label="Justificativa" className="sm:col-span-2"><span className="wrap-anywhere whitespace-pre-wrap">{event.reason}</span></CompanyField>}
            </dl>
          </div>
        ) : result.isError && (status === 404 ? <p className="py-4 text-sm font-medium">Evento de auditoria não encontrado.</p>
          : <CompanyReadError title="Consulta do evento indisponível" retry={() => void result.refetch()} />)}
      </SkeletonReveal>
    </AdminDetailsDialog>
  );
}

export function AdminAuditScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const heading = useRef<HTMLHeadingElement>(null);
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const [details, setDetails] = useState<{ id: string; open: boolean } | null>(null);
  const requestedQuery = adminAuditQueryFrom(useSearchParams());
  const query = !development && requestedQuery.category === "PIX"
    ? { ...requestedQuery, category: "ALL" as const, page: 1 } : requestedQuery;
  const filterKey = adminAuditHref({ ...query, page: 1 });
  const filtered = filterKey !== adminAuditHref(initialQuery);
  const result = useQuery({
    queryKey: ["admin-audit", user.id, filterKey, query.page],
    queryFn: ({ signal }) => adminAudit.list(query, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === user.id && previous.queryKey[2] === filterKey ? data : undefined,
    staleTime: 15_000, retry: retryAuditRead, retryDelay: 1_250,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const report = denied ? undefined : result.data;
  const loading = result.isPending || result.isPlaceholderData;

  function navigate(next: AdminAuditQuery) {
    window.history.replaceState(null, "", adminAuditHref(next));
  }

  const openEvent: OpenEvent = (id, trigger) => {
    detailsTrigger.current = trigger;
    setDetails({ id, open: true });
  };

  function restoreFocus(event: Event) {
    event.preventDefault();
    const trigger = detailsTrigger.current;
    if (trigger?.isConnected && trigger.offsetWidth > 0) trigger.focus();
    else heading.current?.focus();
    setDetails(null);
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Trilha de auditoria</h1>
        <p className="text-pretty text-sm text-muted-foreground">Acompanhe acessos, decisões e alterações registradas pelo Slopay.</p>
      </header>
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="audit-events">
        <header className="space-y-1 px-4 py-4 sm:px-5">
          <h2 id="audit-events" className="text-balance text-lg font-semibold">Eventos registrados</h2>
          <p className="text-pretty text-sm text-muted-foreground">Datas e horários de Brasília.</p>
        </header>
        <AuditFilters query={query} onChange={navigate} />
        {loading && <span role="status" className="sr-only">Carregando eventos de auditoria</span>}
        <SkeletonReveal flow revealed={!loading} skeleton={<AuditRowsSkeleton />}>
          {report?.items.length ? <AuditRows entries={report.items} openEvent={openEvent} /> : report ? (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Nenhum evento encontrado</h3>
              {filtered ? <Button type="button" variant="outline" className="h-11" onClick={() => navigate(initialQuery)}>Restaurar filtros</Button>
                : <Button type="button" variant="outline" className="h-11" onClick={() => navigate({ ...initialQuery, period: "ALL" })}>Consultar todo o período</Button>}
            </div>
          ) : result.isError && (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Consulta de auditoria indisponível</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
        {report && report.pagination.total > 0 && <TablePagination {...report.pagination} busy={loading} label="Paginação da auditoria"
          onPageChange={(page) => navigate({ ...query, page })} />}
      </Card>
      {details && <AuditEventDialog key={details.id} id={details.id} userId={user.id} open={details.open}
        onOpenChange={(open) => setDetails({ id: details.id, open })} onCloseAutoFocus={restoreFocus} />}
    </AdminPanel>
  );
}
