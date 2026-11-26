"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, RefreshCw, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { FilterInput, FilterSelect, FilterSheet, applySearchFilters } from "@/components/shared/filter-sheet";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { adminDatePeriodLabels } from "../admin-date-period";
import {
  adminPixMed, initialMedQuery, medBalanceLabels, medDirectionLabels, medHref, medId, medQuery,
  medQueryFrom, medRegister, medStateLabels, type MedItem, type MedQuery,
} from "../admin-pix-med";
import { retryAdminRead } from "../admin-query";
import { useAdminAccess } from "./admin-access-provider";
import { AdminPixMedDetail, MedBalanceBadge } from "./admin-pix-med-detail";

type ChangeFilters = (changes: Partial<MedQuery>) => void;

function selectItems<T extends string>(labels: Record<T, string>, all: string) {
  return [{ value: "ALL", label: all }, ...Object.entries<string>(labels).map(([value, label]) => ({ value, label }))];
}

const periodOptions = Object.entries(adminDatePeriodLabels).map(([value, label]) => ({ value, label }));
const stateOptions = selectItems(medStateLabels, "Todas as situações");
const balanceOptions = selectItems(medBalanceLabels, "Todos os estados");
const directionOptions = selectItems(medDirectionLabels, "Todas as direções");

function MedFilterFields({ adminId, query, onChange }: { adminId: string; query: MedQuery; onChange: ChangeFilters }) {
  const [clientTerm, setClientTerm] = useState("");
  const [walletTerm, setWalletTerm] = useState("");
  const [committed, setCommitted] = useState({ clientSearch: "", walletSearch: "" });
  const clientSearch = clientTerm.trim();
  const walletSearch = walletTerm.trim();
  const searching = clientSearch !== committed.clientSearch || walletSearch !== committed.walletSearch;
  useEffect(() => {
    const timer = window.setTimeout(() => setCommitted({ clientSearch, walletSearch }), 250);
    return () => window.clearTimeout(timer);
  }, [clientSearch, walletSearch]);

  const selection = { provider: query.provider, walletId: query.walletId, merchantId: query.merchantId };
  const options = useQuery({
    queryKey: ["admin-med-options", adminId, selection, committed],
    queryFn: ({ signal }) => adminPixMed.options({ ...selection, ...committed }, signal),
    retry: retryAdminRead, staleTime: 30_000,
    placeholderData: (previous, request) => request?.queryKey[1] === adminId ? previous : undefined,
  });
  const busy = searching || options.isPending;
  const clients = options.data?.clients ?? [];
  const wallets = options.data?.wallets ?? [];
  const providers = options.data?.providers ?? [];
  return <>
    <FilterInput label="Buscar contestação" placeholder="Protocolo, End-to-End ou nome" maxLength={120} value={query.search}
      onChange={event => onChange({ search: event.target.value })} />
    <FilterSelect label="Cliente" value={query.merchantId ?? "ALL"} options={[{ value: "ALL", label: "Todos os clientes" }, ...clients]}
      search={{ label: "Pesquisar cliente", placeholder: "Pesquisar por nome", value: clientTerm, maxLength: 120,
        onChange: setClientTerm, busy, status: options.isError ? "Consulta indisponível." : clientSearch && !clients.length ? "Nenhum cliente encontrado." : undefined }}
      onChange={value => { setClientTerm(""); onChange({ merchantId: value === "ALL" ? undefined : value }); }} />
    <FilterSelect label="Provedor" value={query.provider ?? "ALL"} options={[{ value: "ALL", label: "Todos os provedores" }, ...providers]}
      onChange={value => onChange({ provider: value === "ALL" ? undefined : value, walletId: undefined })} />
    <FilterSelect label="Carteira" value={query.walletId ?? "ALL"} options={[{ value: "ALL", label: "Todas as carteiras" }, ...wallets]}
      search={{ label: "Pesquisar carteira", placeholder: "Nome ou ID", value: walletTerm, maxLength: 120,
        onChange: setWalletTerm, busy, status: options.isError ? "Consulta indisponível." : walletSearch && !wallets.length ? "Nenhuma carteira encontrada." : undefined }}
      onChange={value => { setWalletTerm(""); onChange({ walletId: value === "ALL" ? undefined : value }); }} />
    <FilterSelect label="Situação da revisão" value={query.state} options={stateOptions}
      onChange={value => onChange({ state: medQuery.shape.state.parse(value) })} />
    <FilterSelect label="Retenção no provedor" value={query.balance} options={balanceOptions}
      onChange={value => onChange({ balance: medQuery.shape.balance.parse(value) })} />
    <FilterSelect label="Direção do Pix" value={query.direction} options={directionOptions}
      onChange={value => onChange({ direction: medQuery.shape.direction.parse(value) })} />
    <FilterSelect label="Data de atualização" value={query.period} options={periodOptions}
      onChange={value => onChange({ period: medQuery.shape.period.parse(value) })} />
    {options.isError && <p role="status" className="text-sm text-muted-foreground">{options.error.message}</p>}
  </>;
}

function MedFilters({ adminId, query, onChange }: { adminId: string; query: MedQuery; onChange: (draft: MedQuery) => void }) {
  const active = medHref({ ...query, page: 1 }) !== medHref(initialMedQuery);

  return <FilterSheet value={query} defaults={initialMedQuery} active={active}
    onApply={draft => applySearchFilters(draft, medQuery.shape.search, onChange)}>
    {(draft, setDraft) => <MedFilterFields adminId={adminId} query={draft} onChange={changes => setDraft({ ...draft, ...changes })} />}
  </FilterSheet>;
}

function SummaryCard({ label, loading, children }: { label: string; loading: boolean; children: ReactNode }) {
  return <Card className="min-w-0 gap-2 p-4 sm:p-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    {loading ? <Skeleton className="h-7 w-20 sm:h-8" /> : <p className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">{children}</p>}
  </Card>;
}

function MedTable({ items, onOpen }: { items: MedItem[]; onOpen: (item: MedItem, button: HTMLButtonElement) => void }) {
  return <Table className="min-w-250 whitespace-nowrap" scrollLabel="Tabela de contestações Pix com rolagem horizontal">
    <caption className="sr-only">Contestações do Mecanismo Especial de Devolução do Pix</caption>
    <TableHeader className="bg-muted/30">
      <TableRow>
        <TableHead scope="col">Contestação</TableHead><TableHead scope="col">Cliente</TableHead>
        <TableHead scope="col">Solicitante</TableHead><TableHead scope="col">Carteira e provedor</TableHead>
        <TableHead scope="col">Retenção</TableHead><TableHead scope="col">Situação</TableHead>
        <TableHead scope="col">Atualizada</TableHead><TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map(item => <TableRow key={item.id}>
        <TableCell className="font-medium">
          <span className="block max-w-40 truncate" title={item.providerProtocol ?? item.id}>{item.providerProtocol ?? item.id.slice(0, 8)}</span>
          <span className="text-xs text-muted-foreground">{medDirectionLabels[item.direction]}</span>
        </TableCell>
        <TableCell>
          <span className="block max-w-48 truncate" title={item.client?.name}>{item.client?.name ?? "Sem vínculo"}</span>
          {item.client?.company && <span className="block max-w-48 truncate text-xs text-muted-foreground" title={item.client.company}>{item.client.company}</span>}
        </TableCell>
        <TableCell><span className="block max-w-48 truncate" title={item.requester.name ?? undefined}>{item.requester.name ?? "A identificar"}</span></TableCell>
        <TableCell>
          <span className="block max-w-48 truncate font-medium" title={item.wallet.name}>{item.wallet.name}</span>
          <span className="text-xs text-muted-foreground">{item.provider.name} · {item.wallet.reference.slice(-8)}</span>
        </TableCell>
        <TableCell className="space-y-1">
          <MedBalanceBadge state={item.balanceState} />
          {item.balanceState === "BLOCKED" && <div className="text-xs tabular-nums"><PanelAmount cents={item.blockedInCents - item.releasedInCents} /></div>}
        </TableCell>
        <TableCell><Badge variant={item.state === "CLOSED" ? "secondary" : item.state === "WAITING" ? "warning" : "info"}>{medStateLabels[item.state]}</Badge></TableCell>
        <TableCell className="text-xs tabular-nums text-muted-foreground">{formatDateTime(item.updatedAt)}</TableCell>
        <TableCell className="pr-3 text-right">
          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Abrir contestação ${item.id.slice(0, 8)}`}
            onClick={event => onOpen(item, event.currentTarget)}><ChevronRight aria-hidden="true" /></Button>
        </TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function RegisterMedDialog({ onClose, onRegister, onRestoreFocus }: {
  onClose: () => void; onRegister: (id: string) => void; onRestoreFocus: () => void;
}) {
  const [operationId, setOperationId] = useState("");
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({
    mutationFn: adminPixMed.register,
    onSuccess: ({ id }) => {
      toast.success("Contestação disponível para acompanhamento.", { icon: <LoadingConfirmation size={20} animate /> });
      onClose();
      onRegister(id);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = medRegister.safeParse({ operationId: operationId.trim() });
    if (!parsed.success) { setInvalid(true); return; }
    mutation.mutate(parsed.data.operationId);
  }

  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}
      onInteractOutside={event => { if (mutation.isPending) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle>Registrar contestação Pix</DialogTitle>
        <DialogDescription>Adicione ao acompanhamento um caso já informado ou documentado. O registro fica no Slopay.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <div className="grid gap-2">
          <label htmlFor="med-operation" className="text-sm font-medium">ID da operação no Slopay</label>
          <Input id="med-operation" required maxLength={36} autoComplete="off" autoFocus value={operationId}
            aria-invalid={invalid || undefined} aria-describedby={invalid ? "med-operation-error" : "med-operation-hint"}
            onChange={event => { setOperationId(event.target.value); setInvalid(false); }} />
          <p id="med-operation-hint" className="text-sm text-muted-foreground">Copie o ID nos detalhes do Pix liquidado em Movimentações.</p>
          {invalid && <p id="med-operation-error" role="alert" className="text-sm text-destructive">Informe o ID completo da operação.</p>}
        </div>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
        <DialogFooter><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Registrando…" : "Registrar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function AdminPixMedScreen({ adminId, preview = false }: { adminId: string; preview?: boolean }) {
  const { can } = useAdminAccess();
  const params = useSearchParams();
  const query = medQueryFrom(params);
  const selection = medId.safeParse(params.get("caso"));
  const caseId = selection.success ? selection.data : undefined;
  const [registering, setRegistering] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const key = medHref({ ...query, page: 1 });
  const reportQuery = useQuery({
    queryKey: ["admin-pix-med", adminId, key, query.page],
    queryFn: ({ signal }) => adminPixMed.list(query, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === adminId ? previous : undefined,
    enabled: !preview, staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = reportQuery.error instanceof ApiError && [401, 403].includes(reportQuery.error.status);
  const report = denied ? undefined : reportQuery.data;
  const loading = !preview && (reportQuery.isPending || reportQuery.isPlaceholderData);
  const canReview = can("admin.med.review");
  const changeFilters = (next: MedQuery) => window.history.replaceState(null, "", medHref(next));

  function open(id: string) {
    window.history.pushState({ medDetail: true }, "", medHref({ ...query, page: report?.pagination.page ?? query.page }, id));
  }

  function close() {
    if (window.history.state?.medDetail) window.history.back();
    else window.history.replaceState(null, "", medHref(query));
  }

  function restoreFocus() {
    (trigger.current?.isConnected ? trigger.current : heading.current)?.focus();
  }

  return <>
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Contestações Pix</h1>
        <p className="text-pretty text-sm text-muted-foreground">Acompanhe solicitações e retenções do Mecanismo Especial de Devolução.</p>
      </div>
      {report?.available && <div className="flex flex-wrap gap-2">
        <MedFilters adminId={adminId} query={query} onChange={changeFilters} />
        <Button variant="outline" type="button" className="px-3" disabled={reportQuery.isFetching}
          aria-label="Atualizar lista" onClick={() => void reportQuery.refetch()}>
          <RefreshCw aria-hidden="true" /><span className="hidden sm:inline">Atualizar lista</span>
        </Button>
        {canReview && <Button type="button" onClick={event => { trigger.current = event.currentTarget; setRegistering(true); }}>
          <Plus aria-hidden="true" /> Registrar contestação
        </Button>}
      </div>}
    </header>
    {report?.available && <section aria-label="Resumo das contestações filtradas" className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
      <SummaryCard loading={loading} label="Em acompanhamento">{report.summary.open}</SummaryCard>
      <SummaryCard loading={loading} label="Com bloqueio informado">{report.summary.blocked}</SummaryCard>
      <SummaryCard loading={loading} label="Valor retido informado"><PanelAmount cents={report.summary.blockedInCents} /></SummaryCard>
      <SummaryCard loading={loading} label="Sem cliente vinculado">{report.summary.unidentified}</SummaryCard>
    </section>}
    <Card className="min-w-0 gap-0 overflow-hidden py-0" aria-labelledby="med-list">
      <header className="border-b border-border p-4 sm:p-5">
        <h2 id="med-list" className="text-balance text-lg font-semibold">Casos de MED</h2>
      </header>

      <SkeletonReveal flow revealed={!loading} skeleton={<div role="status" className="grid gap-4 p-5">
        <span className="sr-only">Consultando contestações Pix</span>
        {[1, 2, 3, 4].map(line => <Skeleton key={line} className="h-8 w-full animate-none" />)}
      </div>}>
        {report?.available && report.items.length ? <>
          <MedTable items={report.items} onOpen={(item, button) => { trigger.current = button; open(item.id); }} />
          <TablePagination {...report.pagination} busy={reportQuery.isFetching} label="Paginação das contestações Pix"
            onPageChange={page => window.history.replaceState(null, "", medHref({ ...query, page }))} />
        </> : (report || reportQuery.isError || preview) && <div className="grid min-h-44 content-center justify-items-center gap-2 px-5 py-8 text-center">
          <ScanSearch className="size-5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-balance font-semibold">{reportQuery.isError ? "Consulta indisponível"
            : report?.available ? "Nenhuma contestação encontrada" : "Integração MED indisponível"}</h3>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">{reportQuery.isError ? reportQuery.error.message
            : report?.available ? "A lista mostra os casos que correspondem aos filtros selecionados."
              : "Os eventos de MED são recebidos pela integração de produção."}</p>
          {reportQuery.isError && !denied && <Button type="button" variant="outline" onClick={() => void reportQuery.refetch()}>Tentar novamente</Button>}
        </div>}
      </SkeletonReveal>
    </Card>
    {registering && canReview && !denied && <RegisterMedDialog onClose={() => setRegistering(false)} onRestoreFocus={restoreFocus} onRegister={id => {
      void queryClient.invalidateQueries({ queryKey: ["admin-pix-med", adminId] });
      open(id);
    }} />}
    {caseId && !denied && !preview && <AdminPixMedDetail key={caseId} adminId={adminId} caseId={caseId} canReview={canReview}
      canViewOperation={can("admin.movements.read")} onClose={close}
      onRestoreFocus={restoreFocus} />}
  </>;
}
