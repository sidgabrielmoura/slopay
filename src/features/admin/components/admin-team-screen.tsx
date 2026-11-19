"use client";

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
import { operationalSearch } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import {
  adminMemberStatusFilter, adminTeam, adminTeamHref, adminTeamKey, adminTeamQuery, adminTeamQueryFrom,
  adminTeamStatuses, type AdminTeamMember, type AdminTeamQuery, type AdminTeamSummary,
} from "../admin-team";
import { AdminMemberLogin, AdminMemberStatus } from "./admin-team-member-display";
import { AdminTeamMemberDialog } from "./admin-team-member-dialog";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const initialQuery = adminTeamQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const statuses = adminMemberStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : adminTeamStatuses[value].label,
}));

function TeamSummary({ summary, loading }: { summary?: AdminTeamSummary; loading: boolean }) {
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  const cells = [
    { label: "Membros", value: summary?.total },
    { label: "Ativos", value: summary?.active },
    { label: "Suspensos", value: summary?.suspended },
    { label: "Bloqueados ou pendentes", value: summary?.restricted },
  ];

  return (
    <SkeletonReveal flow revealed={!loading} skeleton={<div className={grid}>
      {cells.map(({ label }) => <div key={label} className="min-w-0 space-y-2 bg-card p-4 sm:p-5">
        <Skeleton className="h-4 w-4/5 animate-none" /><Skeleton className="h-6 w-10 animate-none" />
      </div>)}
    </div>}>
      {summary && (
        <dl className={grid} aria-label="Resumo do acesso administrativo">
          {cells.map(({ label, value }) => <div key={label} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
            <dt className="text-pretty text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{count.format(value ?? 0)}</dd>
          </div>)}
        </dl>
      )}
    </SkeletonReveal>
  );
}

function TeamFilters({ query, onChange }: { query: AdminTeamQuery; onChange: (query: AdminTeamQuery) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState({ submitted: query.search, value: query.search });
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
    <form role="search" aria-label="Filtrar equipe administrativa" onSubmit={submit}
      className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:px-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,15rem)_auto] lg:items-end">
      <div className="grid min-w-0 gap-2">
        <label htmlFor="admin-team-search" className="text-sm font-medium">Buscar membro</label>
        <div className="flex min-w-0 gap-2">
          <Input id="admin-team-search" ref={input} type="search" className="h-11 min-w-0" placeholder="Nome ou e-mail"
            autoComplete="off" maxLength={120} value={search} onChange={(event) => setDraft({ submitted: query.search, value: event.target.value })} />
          <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar membro">
            <Search aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="admin-team-status" className="text-sm font-medium">Situação do acesso</span>
        <GlideSelect aria-labelledby="admin-team-status" size="lg" options={statuses} value={query.status} menuWidth={224}
          onChange={(status) => onChange({ ...query, status: adminMemberStatusFilter.parse(status), page: 1 })} />
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

function TeamIdentity({ member, isSelf }: { member: AdminTeamMember; isSelf: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className="min-w-0 wrap-anywhere font-medium">{member.name}</p>
        {isSelf && <Badge variant="secondary">Sua conta</Badge>}
      </div>
      <p className="wrap-anywhere text-xs text-muted-foreground">{member.email}</p>
    </div>
  );
}

type OpenMember = (id: string, trigger: HTMLButtonElement) => void;

function MemberButton({ member, openMember }: { member: AdminTeamMember; openMember: OpenMember }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      aria-label={"Ver detalhes de " + member.name} aria-haspopup="dialog" onClick={(event) => openMember(member.id, event.currentTarget)}>
      <ChevronRight aria-hidden="true" />
    </Button>
  );
}

function TeamRows({ members, userId, openMember }: { members: AdminTeamMember[]; userId: string; openMember: OpenMember }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Membros da equipe administrativa" className="table-fixed">
          <colgroup><col className="w-2/5" /><col className="w-1/5" /><col className="w-1/5" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Nome e e-mail</TableHead>
              <TableHead scope="col">Situação</TableHead>
              <TableHead scope="col" className="whitespace-normal">Verificação em duas etapas</TableHead>
              <TableHead scope="col">Último login</TableHead>
              <TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="py-3 pl-5"><TeamIdentity member={member} isSelf={member.id === userId} /></TableCell>
              <TableCell className="py-3"><AdminMemberStatus status={member.status} /></TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">{member.mfaEnabled ? "Ativa" : "Pendente"}</TableCell>
              <TableCell className="py-3 text-sm"><AdminMemberLogin lastLoginAt={member.lastLoginAt} /></TableCell>
              <TableCell className="px-2 py-2 text-right"><MemberButton member={member} openMember={openMember} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Membros da equipe administrativa" className="min-w-0 divide-y divide-border xl:hidden">
        {members.map((member) => (
          <li key={member.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <TeamIdentity member={member} isSelf={member.id === userId} /><MemberButton member={member} openMember={openMember} />
            </div>
            <AdminMemberStatus status={member.status} />
            <dl className="grid min-w-0 grid-cols-2 gap-2 text-sm">
              <div className="space-y-0.5"><dt className="text-xs text-muted-foreground">Verificação em duas etapas</dt><dd>{member.mfaEnabled ? "Ativa" : "Pendente"}</dd></div>
              <div className="space-y-0.5"><dt className="text-xs text-muted-foreground">Último login</dt><dd><AdminMemberLogin lastLoginAt={member.lastLoginAt} /></dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminTeamScreen({ user }: { user: AdminIdentity }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const [details, setDetails] = useState<{ id: string; open: boolean } | null>(null);
  const query = adminTeamQueryFrom(useSearchParams());
  const filterKey = adminTeamHref({ ...query, page: 1 });
  const filtered = Boolean(query.search || query.status !== "ALL");
  const result = useQuery({
    queryKey: [...adminTeamKey(user.id), filterKey, query.page],
    queryFn: ({ signal }) => adminTeam.list(query, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === user.id && previous.queryKey[2] === filterKey ? data : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const report = denied ? undefined : result.data;
  const loading = result.isPending || result.isPlaceholderData;

  function navigate(next: AdminTeamQuery) {
    window.history.replaceState(null, "", adminTeamHref(next));
  }

  const openMember: OpenMember = (id, trigger) => {
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
        <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Equipe Administrativa</h1>
        <p className="text-pretty text-sm text-muted-foreground">Gerencie o acesso dos superadmins e consulte o histórico de alterações da equipe.</p>
      </header>
      {(result.isPending || report) && <TeamSummary summary={report?.summary} loading={result.isPending} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="admin-team-members">
        <header className="px-4 py-4 sm:px-5">
          <h2 id="admin-team-members" className="text-balance text-lg font-semibold">Superadmins</h2>
        </header>
        <TeamFilters query={query} onChange={navigate} />
        {loading && <span role="status" className="sr-only">Carregando equipe administrativa</span>}
        <SkeletonReveal flow revealed={!loading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {report?.items.length ? <TeamRows members={report.items} userId={user.id} openMember={openMember} /> : report ? (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Nenhum membro encontrado</h3>
              {filtered ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => navigate(initialQuery)}>Mostrar todos os membros</Button>
              ) : (
                <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Atualizar lista</Button>
              )}
            </div>
          ) : result.isError && (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Consulta da equipe indisponível</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
        {report && report.pagination.total > 0 && (
          <TablePagination {...report.pagination} busy={loading} label="Paginação da equipe"
            onPageChange={(page) => navigate({ ...query, page })} />
        )}
      </Card>
      {details && <AdminTeamMemberDialog key={details.id} memberId={details.id} userId={user.id} open={details.open}
        onOpenChange={(open) => setDetails({ id: details.id, open })} onCloseAutoFocus={restoreFocus} />}
    </AdminPanel>
  );
}
