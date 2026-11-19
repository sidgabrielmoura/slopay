"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
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
import { operationalAccountsPath, operationalSearch } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import {
  adminWebhookHref, adminWebhookQuery, adminWebhookQueryFrom, adminWebhookStatusFilter, adminWebhookStatuses, adminWebhooks,
  type AdminWebhook, type AdminWebhookQuery, type AdminWebhookSummary,
} from "../admin-webhooks";
import { WebhookRowsSkeleton, WebhookStatus } from "./admin-webhook-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const initialQuery = adminWebhookQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const rate = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 });
const statusOptions = adminWebhookStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : adminWebhookStatuses[value].label,
}));

function WebhookSummary({ summary, loading }: { summary?: AdminWebhookSummary; loading: boolean }) {
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  const items = summary && [
    {
      title: "Destinos cadastrados", value: count.format(summary.destinations),
      note: count.format(summary.interrupted) + (summary.interrupted === 1 ? " fila interrompida" : " filas interrompidas"),
    },
    {
      title: "Taxa de sucesso", value: summary.completedAttempts ? rate.format(summary.successfulAttempts / summary.completedAttempts) : "—",
      note: summary.completedAttempts ? count.format(summary.successfulAttempts) + " de " + count.format(summary.completedAttempts) + " tentativas concluídas" : "Sem tentativas concluídas",
    },
    {
      title: "Duração média", value: summary.averageDurationMs === null ? "—" : count.format(summary.averageDurationMs) + " ms",
      note: "Por tentativa concluída",
    },
    {
      title: "Retentativas", value: count.format(summary.retries), note: "Do segundo envio em diante",
    },
  ];

  return (
    <section className="min-w-0 space-y-3" aria-labelledby="webhook-summary">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="webhook-summary" className="text-balance text-lg font-semibold">Saúde das entregas</h2>
        <p className="text-sm text-muted-foreground">Tentativas nas últimas 24 h</p>
      </div>
      <SkeletonReveal flow revealed={!loading} skeleton={<div className={grid}>
        {[1, 2, 3, 4].map((key) => <div key={key} className="min-h-28 space-y-3 bg-card p-4 sm:p-5">
          <Skeleton className="h-3 w-4/5 animate-none" /><Skeleton className="h-6 w-1/2 animate-none" /><Skeleton className="h-3 w-3/4 animate-none" />
        </div>)}
      </div>}>
        {items && <dl className={grid}>{items.map(({ title, value, note }) => (
          <div key={title} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
            <dt className="text-pretty text-sm text-muted-foreground">{title}</dt>
            <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">{value}</dd>
            <dd className="text-pretty text-xs text-muted-foreground tabular-nums">{note}</dd>
          </div>
        ))}</dl>}
      </SkeletonReveal>
    </section>
  );
}

function DestinationFilters({ query, onChange }: { query: AdminWebhookQuery; onChange: (query: AdminWebhookQuery) => void }) {
  const [draft, setDraft] = useState({ submitted: query.search, value: query.search });
  const input = useRef<HTMLInputElement>(null);
  const search = draft.submitted === query.search ? draft.value : query.search;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = operationalSearch.safeParse(search);
    if (!parsed.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ submitted: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar destinos" onSubmit={submit}
      className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:px-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,16rem)_auto] lg:items-end">
      <div className="grid min-w-0 gap-2">
        <label htmlFor="admin-webhook-search" className="text-sm font-medium">Buscar destino</label>
        <div className="flex min-w-0 gap-2">
          <Input id="admin-webhook-search" type="search" ref={input} className="h-11 min-w-0" autoComplete="off" maxLength={120}
            value={search} placeholder="Webhook, domínio, empresa ou CNPJ"
            onChange={(event) => setDraft({ submitted: query.search, value: event.target.value })} />
          <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar destino"><Search aria-hidden="true" /></Button>
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="admin-webhook-status" className="text-sm font-medium">Situação do webhook</span>
        <GlideSelect aria-labelledby="admin-webhook-status" options={statusOptions} size="lg" menuWidth={224} value={query.status}
          onChange={(status) => onChange({ ...query, status: adminWebhookStatusFilter.parse(status), page: 1 })} />
      </div>
      {(query.search || query.status !== "ALL") && (
        <Button type="button" variant="ghost" className="h-11 w-fit" onClick={() => {
          setDraft({ submitted: "", value: "" });
          onChange(initialQuery);
          input.current?.focus();
        }}>Limpar filtros</Button>
      )}
    </form>
  );
}

function WebhookIdentity({ webhook }: { webhook: AdminWebhook }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium" title={webhook.name}>{webhook.name}</p>
      <p className="truncate text-xs text-muted-foreground" title={webhook.company}>{webhook.company}</p>
      {webhook.host && <p className="truncate text-xs text-muted-foreground" title={webhook.host}>{webhook.host}</p>}
    </div>
  );
}

function DeliverySettings({ webhook }: { webhook: AdminWebhook }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm">{webhook.mode === "SEQUENTIAL" ? "Sequencial" : "Não sequencial"}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{count.format(webhook.events.length)} {webhook.events.length === 1 ? "evento" : "eventos"}</p>
    </div>
  );
}

function OpenWebhook({ webhook, query }: { webhook: AdminWebhook; query: AdminWebhookQuery }) {
  return (
    <Button asChild size="icon" variant="ghost" className="size-11 shrink-0 text-muted-foreground">
      <Link href={adminWebhookHref(query, webhook.id)} prefetch={false} aria-label={"Ver webhook " + webhook.name + " de " + webhook.company}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

function DestinationRows({ items, query }: { items: AdminWebhook[]; query: AdminWebhookQuery }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table aria-label="Destinos de webhooks" className="table-fixed">
          <colgroup><col className="w-1/2" /><col className="w-1/5" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Destino e empresa</TableHead><TableHead scope="col">Modo de entrega</TableHead>
              <TableHead scope="col">Situação</TableHead><TableHead scope="col"><span className="sr-only">Histórico</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((webhook) => (
            <TableRow key={webhook.id}>
              <TableCell className="py-3 pl-5"><WebhookIdentity webhook={webhook} /></TableCell>
              <TableCell className="py-3"><DeliverySettings webhook={webhook} /></TableCell>
              <TableCell className="py-3"><WebhookStatus status={webhook.status} /></TableCell>
              <TableCell className="px-2 py-2 text-right"><OpenWebhook webhook={webhook} query={query} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Destinos de webhooks" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((webhook) => (
          <li key={webhook.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2"><WebhookIdentity webhook={webhook} /><OpenWebhook webhook={webhook} query={query} /></div>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><DeliverySettings webhook={webhook} /><WebhookStatus status={webhook.status} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminWebhooksScreen({ user }: { user: AdminIdentity }) {
  const query = adminWebhookQueryFrom(useSearchParams());
  const filterKey = adminWebhookHref({ ...query, page: 1 });
  const filtered = Boolean(query.search || query.status !== "ALL");
  const result = useQuery({
    queryKey: ["admin-webhooks", user.id, filterKey, query.page],
    queryFn: ({ signal }) => adminWebhooks.list(query, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === user.id && previous.queryKey[2] === filterKey ? data : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const report = denied ? undefined : result.data;
  const loading = result.isPending || result.isPlaceholderData;

  function navigate(next: AdminWebhookQuery) {
    window.history.replaceState(null, "", adminWebhookHref(next));
  }

  return (
    <AdminPanel user={user}>
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Webhooks Globais</h1>
            <Badge variant="secondary">Sandbox</Badge>
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Acompanhe os webhooks de saída das empresas e consulte o histórico de entregas.</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/admin/pendencias" prefetch={false}>Ver pendências <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </header>
      {(result.isPending || report) && <WebhookSummary summary={report?.summary} loading={result.isPending} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="global-webhook-destinations">
        <div className="space-y-1 px-4 py-4 sm:px-5">
          <h2 id="global-webhook-destinations" className="text-balance text-lg font-semibold">Destinos por empresa</h2>
          <p className="text-pretty text-sm text-muted-foreground">Abra um destino para ver os eventos assinados e as respostas de cada tentativa.</p>
        </div>
        <DestinationFilters query={query} onChange={navigate} />
        {loading && <span role="status" className="sr-only">Carregando destinos de webhooks</span>}
        <SkeletonReveal flow revealed={!loading} skeleton={<WebhookRowsSkeleton />}>
          {report?.items.length ? <DestinationRows items={report.items} query={{ ...query, page: report.pagination.page }} /> : report ? (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">{filtered ? "Nenhum destino para os filtros selecionados" : "Nenhum webhook cadastrado"}</h3>
              {filtered ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => navigate(initialQuery)}>Mostrar todos os destinos</Button>
              ) : (
                <>
                  <p className="max-w-sm text-pretty text-sm text-muted-foreground">Os destinos configurados pelas empresas em Integrações aparecem aqui.</p>
                  <Button asChild variant="outline" className="h-11"><Link href={operationalAccountsPath} prefetch={false}>Ver contas operacionais</Link></Button>
                </>
              )}
            </div>
          ) : result.isError && (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Consulta de webhooks indisponível</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
        {report && report.pagination.total > 0 && (
          <TablePagination {...report.pagination} busy={loading} label="Paginação dos webhooks"
            onPageChange={(page) => navigate({ ...query, page })} />
        )}
      </Card>
    </AdminPanel>
  );
}
