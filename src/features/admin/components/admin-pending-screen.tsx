"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Building2, ChevronRight, ClipboardList, RotateCw, Search, Webhook } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { formatDateTime } from "@/lib/dates";
import { openingsPath } from "../account-openings";
import { adminWebhooksPath } from "../admin-webhooks";
import { pixTransactionsPath } from "../admin-pix-transactions";
import { adminApprovalsPath } from "../admin-withdrawal-approvals";
import {
  adminPendingListKey, fetchAdminPending, fetchPendingDetail, pendingCategories, pendingCategoryLabels, pendingCategorySchema,
  pendingInstructions, pendingKeySchema, pendingKindLabels, pendingResponsibleLabels, pendingStateLabels,
  type AdminPendingReport, type PendingCategory, type PendingItem,
} from "../admin-pending";
import { AdminConnectionStatus, useAdminActivity } from "./admin-activity-provider";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const icons = { ACCOUNT: Building2, CHARGE: ArrowDownLeft, WITHDRAWAL: ArrowUpRight, WEBHOOK: Webhook };

function PendingSkeleton() {
  return <div className="grid gap-5" aria-hidden="true">
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32 animate-none rounded-none" />)}
    </div>
    <Skeleton className="h-20 animate-none rounded-xl" />
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border">
      {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 animate-none rounded-none" />)}
    </div>
  </div>;
}

export function AdminPendingLoading({ user }: { user: AdminIdentity }) {
  return <AdminPanel user={user}>
    <header className="grid gap-1"><h1 className="text-balance text-2xl font-semibold sm:text-3xl">Fila de pendências</h1><p role="status" className="text-pretty text-sm text-muted-foreground">Carregando as pendências da operação…</p></header>
    <PendingSkeleton />
  </AdminPanel>;
}

export function AdminPendingScreen({ user, initialReport }: { user: AdminIdentity; initialReport: AdminPendingReport | null }) {
  const development = useDevelopmentFeatures();
  const router = useRouter();
  const params = useSearchParams();
  const activity = useAdminActivity();
  const [category, setCategory] = useState<PendingCategory>("ALL");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const urlKey = pendingKeySchema.safeParse(params.get("item"));
  const selectedKey = selected ?? (urlKey.success ? urlKey.data : null);
  const report = useQuery({
    queryKey: adminPendingListKey(user.id, category, search, page),
    queryFn: ({ signal }) => fetchAdminPending(category, search, page, signal),
    initialData: category === "ALL" && !search && page === 1 ? initialReport ?? undefined : undefined,
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && previous?.category === category && previous.search === search ? previous : undefined,
    staleTime: 10_000, retry: false, refetchInterval: activity?.connection === "live" ? false : 15_000,
  });
  const detail = useQuery({
    queryKey: ["admin-pending", user.id, "detail", selectedKey],
    queryFn: ({ signal }) => fetchPendingDetail(selectedKey!, signal), enabled: Boolean(selectedKey), retry: false, staleTime: 5000,
  });
  const data = report.data;
  const summary = activity?.summary ?? data?.summary;
  const liveRevision = activity?.report?.queueRevision;
  const currentRevision = data?.revision;
  const refetch = report.refetch;
  useEffect(() => {
    if (liveRevision && currentRevision && liveRevision !== currentRevision) void refetch({ cancelRefetch: false });
  }, [liveRevision, currentRevision, refetch]);

  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSearch(draft.trim()); setPage(1); }
  function clearFilters() { setCategory("ALL"); setSearch(""); setDraft(""); setPage(1); }
  function openDetail(item: PendingItem, trigger: HTMLElement) { origin.current = trigger; setSelected(item.id); }
  function closeDetail() {
    setSelected(null);
    if (urlKey.success) router.replace("/admin/pendencias", { scroll: false });
  }

  return <AdminPanel user={user} pendingSummary={summary ? { totalUrgentTasks: summary.total, pendingFinancialApprovalsCount: summary.ownerApproval } : undefined}>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2"><h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Fila de pendências</h1>{development && <Badge variant="secondary">Sandbox</Badge>}</div>
        <p className="text-pretty text-sm text-muted-foreground">Tudo o que precisa de atenção, com o responsável por cada etapa.</p>
      </div>
      <Button type="button" variant="outline" className="h-11 gap-2" disabled={report.isFetching} onClick={() => { void report.refetch(); }}>
        {report.isFetching ? <LoadingIndicator /> : <RotateCw aria-hidden="true" className="size-4" />}Atualizar fila
      </Button>
    </header>
    <ToastNotice message={report.isError ? report.error.message : null} />
    <SkeletonReveal flow revealed={!report.isPending} skeleton={<PendingSkeleton />}>
      {data && summary ? <div className="grid min-w-0 gap-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
          <Summary label="Pendências abertas" value={summary.total} caption="Todas as frentes da operação" />
          <Summary label="Com a equipe Slopay" value={summary.onboarding + summary.review} caption="Cadastros e revisões Pix" />
          <Summary label="Aguardando o titular" value={summary.ownerApproval} caption="Autorização de saques" />
          <Summary label="Webhooks interrompidos" value={summary.webhooks} caption="Entregas que precisam de atenção" />
        </div>
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-end">
            <div className="grid gap-2 lg:w-64 lg:shrink-0">
              <label id="pending-category-label" className="text-sm font-medium">Tipo de pendência</label>
              <GlideSelect ariaLabel="Tipo de pendência" value={category} size="lg"
                options={pendingCategories.map((value) => ({ value, label: pendingCategoryLabels[value] }))}
                onChange={(value) => { setCategory(pendingCategorySchema.parse(value)); setPage(1); }} />
            </div>
            <form className="flex min-w-0 flex-1 items-end gap-2" onSubmit={submitSearch}>
              <div className="grid min-w-0 flex-1 gap-2">
                <label htmlFor="pending-search" className="text-sm font-medium">Buscar na fila</label>
                <Input id="pending-search" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={120}
                  placeholder="Empresa, titular ou identificador" className="h-11" type="search" />
              </div>
              <Button type="submit" variant="outline" className="size-11 shrink-0" aria-label="Buscar pendências"><Search aria-hidden="true" className="size-4" /></Button>
            </form>
            {(category !== "ALL" || search) && <Button type="button" variant="ghost" className="h-11 shrink-0" onClick={clearFilters}>Limpar filtros</Button>}
          </div>
          <CardHeader className="gap-1 p-5">
            <h2 className="text-balance text-lg font-semibold">Pendências em aberto</h2>
            <p className="text-pretty text-sm text-muted-foreground">Mais antigas primeiro em cada prioridade.</p>
          </CardHeader>
          <div aria-busy={report.isPlaceholderData}>
            {data.items.length ? <>
              <table className="hidden w-full table-fixed border-t border-border text-left text-sm xl:table">
                <caption className="sr-only">Pendências abertas com situação, responsável, data e valor</caption>
                <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
                  <th scope="col" className="w-[30%] px-5 py-3 font-medium">Empresa e pendência</th>
                  <th scope="col" className="w-[23%] px-4 py-3 font-medium">Situação</th>
                  <th scope="col" className="w-[20%] px-4 py-3 font-medium">Responsável</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
                  <th scope="col" className="w-16 px-4 py-3"><span className="sr-only">Detalhes</span></th>
                </tr></thead>
                <tbody className="divide-y divide-border">{data.items.map((item) => <tr key={item.id} className="hover:bg-muted/35">
                  <td className="px-5 py-4"><p className="truncate font-medium">{item.company}</p><p className="mt-1 truncate text-xs text-muted-foreground">{pendingKindLabels[item.referenceKind]}</p></td>
                  <td className="px-4 py-4"><PendingBadge item={item} /><p className="mt-1.5 text-xs text-muted-foreground">{formatDateTime(item.createdAt, "short")}</p></td>
                  <td className="px-4 py-4 text-muted-foreground">{pendingResponsibleLabels[item.responsible]}</td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">{item.amountInCents === null ? "—" : <PanelAmount cents={item.amountInCents} />}</td>
                  <td className="px-3 py-4"><Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ver detalhes de ${item.company}, ${pendingKindLabels[item.referenceKind]}`} onClick={(event) => openDetail(item, event.currentTarget)}><ChevronRight aria-hidden="true" className="size-4" /></Button></td>
                </tr>)}</tbody>
              </table>
              <ul className="divide-y divide-border border-t border-border xl:hidden">{data.items.map((item) => {
                const Icon = icons[item.referenceKind];
                return <li key={item.id}><button type="button" onClick={(event) => openDetail(item, event.currentTarget)}
                  className="grid w-full min-w-0 gap-3 px-5 py-4 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  aria-label={`Ver detalhes de ${item.company}, ${pendingKindLabels[item.referenceKind]}`}>
                  <span className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon aria-hidden="true" className="size-4" /></span>
                    <span className="grid min-w-0 flex-1 gap-1"><span className="truncate text-sm font-medium">{item.company}</span><span className="text-xs text-muted-foreground">{pendingKindLabels[item.referenceKind]}</span></span><ChevronRight aria-hidden="true" className="mt-2 size-4 shrink-0 text-muted-foreground" />
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2"><PendingBadge item={item} />{item.amountInCents !== null && <span className="text-sm font-medium tabular-nums"><PanelAmount cents={item.amountInCents} /></span>}</span>
                  <span className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{pendingResponsibleLabels[item.responsible]}</span><span>{formatDateTime(item.createdAt, "short")}</span></span>
                </button></li>;
              })}</ul>
            </> : <div className="grid justify-items-center gap-3 border-t border-border px-5 py-12 text-center">
              <ClipboardList aria-hidden="true" className="size-8 text-muted-foreground" /><h3 className="text-balance font-medium">{category !== "ALL" || search ? "Nenhuma pendência encontrada" : "A operação está em dia"}</h3>
              <p className="max-w-sm text-pretty text-sm text-muted-foreground">{category !== "ALL" || search ? "Ajuste os filtros para consultar outras pendências." : "Novas pendências aparecerão aqui conforme forem registradas."}</p>
              <Button type="button" variant="outline" className="h-11" onClick={category !== "ALL" || search ? clearFilters : () => { void report.refetch(); }}>{category !== "ALL" || search ? "Limpar filtros" : "Atualizar fila"}</Button>
            </div>}
          </div>
          <TablePagination {...data.pagination} busy={report.isPlaceholderData} onPageChange={setPage} label="Paginação das pendências" />
        </Card>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><AdminConnectionStatus /><p>Atualizado em {formatDateTime(data.generatedAt, "short")} · Horário de Brasília</p></div>
      </div> : report.isError && <Card className="grid min-h-64 justify-items-center gap-3 p-6 text-center">
        <h2 className="text-balance text-lg font-semibold">Não foi possível consultar a fila</h2><Button type="button" variant="outline" className="h-11" onClick={() => { void report.refetch(); }}>Tentar novamente</Button>
      </Card>}
    </SkeletonReveal>
    <Dialog open={Boolean(selectedKey)} onOpenChange={(open) => { if (!open) closeDetail(); }}>
      <DialogContent className="max-w-lg" onCloseAutoFocus={(event) => {
        event.preventDefault(); (origin.current?.isConnected ? origin.current : heading.current)?.focus();
      }}>
        <DialogHeader><DialogTitle>{detail.data?.item ? pendingKindLabels[detail.data.item.referenceKind] : "Detalhes da pendência"}</DialogTitle>
          <DialogDescription>{detail.data?.item?.company ?? "Consulte a situação atual registrada pelo Slopay."}</DialogDescription></DialogHeader>
        {detail.isPending ? <div role="status" aria-label="Carregando pendência" className="grid gap-4"><Skeleton className="h-12" /><Skeleton className="h-28" /></div>
          : detail.data?.item ? <PendingDetail item={detail.data.item} />
          : detail.isError ? <div className="grid gap-3"><p className="text-pretty text-sm text-muted-foreground">Não foi possível consultar esta pendência.</p><Button type="button" variant="outline" className="h-11" onClick={() => { void detail.refetch(); }}>Tentar novamente</Button></div>
          : <p className="text-pretty text-sm text-muted-foreground">Esta pendência foi resolvida ou mudou de estado. A fila mostra somente os itens que continuam em aberto.</p>}
      </DialogContent>
    </Dialog>
  </AdminPanel>;
}

function Summary({ label, value, caption }: { label: string; value: number; caption: string }) {
  return <section className="min-w-0 bg-card p-4 sm:p-5"><h2 className="min-h-10 text-balance text-xs font-medium text-muted-foreground sm:text-sm">{label}</h2><p className="mt-2 text-2xl font-semibold tabular-nums">{count.format(value)}</p><p className="mt-2 text-pretty text-xs text-muted-foreground">{caption}</p></section>;
}

function PendingBadge({ item }: { item: PendingItem }) {
  return <Badge variant={item.category === "ONBOARDING" ? "secondary" : "warning"} className="max-w-full whitespace-normal text-xs">{pendingStateLabels[item.state]}</Badge>;
}

function PendingDetail({ item }: { item: PendingItem }) {
  const reference = encodeURIComponent(item.referenceId);
  const action = item.referenceKind === "ACCOUNT" ? { href: openingsPath + "/" + reference, label: "Abrir cadastro" }
    : item.referenceKind === "WEBHOOK" ? { href: adminWebhooksPath + "/" + reference, label: "Consultar webhook" }
    : item.category === "OWNER_APPROVAL" ? { href: adminApprovalsPath + "/" + reference, label: "Ver solicitação de saque" }
    : {
      href: pixTransactionsPath + "?" + new URLSearchParams(item.referenceKind === "CHARGE"
        ? { view: "charges", period: "ALL", detail: "RECEIVE", transaction: item.referenceId }
        : { period: "ALL", search: item.referenceId }),
      label: "Ver movimentação",
    };

  return <div className="grid gap-5">
    <div className="grid gap-3"><PendingBadge item={item} />{item.amountInCents !== null && <p className="text-3xl font-semibold tabular-nums"><PanelAmount cents={item.amountInCents} /></p>}</div>
    <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{item.state === "AWAITING_APPROVAL" ? "O titular precisa revisar e autorizar este saque no próprio acesso. A equipe Slopay acompanha a pendência sem substituir essa aprovação." : pendingInstructions[item.referenceKind]}</p>
    <dl className="grid gap-4 border-t border-border pt-5 text-sm">
      <div className="grid gap-1"><dt className="text-muted-foreground">Responsável pela próxima etapa</dt><dd>{pendingResponsibleLabels[item.responsible]}</dd></div>
      <div className="grid gap-1"><dt className="text-muted-foreground">Titular</dt><dd className="break-words">{item.ownerName}</dd><dd className="break-all text-muted-foreground">{item.ownerEmail}</dd></div>
      <div className="grid gap-1"><dt className="text-muted-foreground">Registrado em</dt><dd>{formatDateTime(item.createdAt, "medium")}</dd></div>
      <div className="grid gap-1"><dt className="text-muted-foreground">Identificador Slopay</dt><dd className="break-all font-mono text-xs">{item.referenceId}</dd></div>
    </dl>
    <Button asChild className="h-11 w-fit"><Link href={action.href} prefetch={false}>{action.label}</Link></Button>
  </div>;
}
