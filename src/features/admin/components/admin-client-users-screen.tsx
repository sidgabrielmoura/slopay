"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { UserIdentity } from "@/features/users/components/user-identity";
import { ApiError } from "@/lib/api-client";
import { openingsPath } from "../account-openings";
import {
  adminClientUsers, clientUserRoleFilter, clientUserRoleLabels, clientUserQuery, clientUserQueryFrom, clientUsersHref,
  type ClientUser, type ClientUserQuery, type ClientUserSummary,
} from "../admin-client-users";
import { companySearch, companyStatusFilter, companyStatusLabels } from "../admin-companies";
import { retryAdminRead } from "../admin-query";
import { AdminClientUserDialog } from "./admin-client-user-dialog";
import { AdminMemberLogin } from "./admin-team-member-display";
import { CompanyAccessBadge } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const defaultQuery = clientUserQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const summaryItems = [["total", "Usuários cadastrados"], ["active", "Ativos"], ["pending", "Em validação"], ["restricted", "Suspensos ou bloqueados"]] as const;
const roles = clientUserRoleFilter.options.map((value) => ({ value, label: clientUserRoleLabels[value] }));
const statuses = companyStatusFilter.options.map((value) => ({ value, label: value === "ALL" ? "Todas as situações" : companyStatusLabels[value] }));

function DirectorySummary({ summary, loading }: { summary?: ClientUserSummary; loading: boolean }) {
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4";
  return (
    <SkeletonReveal flow revealed={!loading} skeleton={<div className={grid}>
      {summaryItems.map(([key]) => <div key={key} className="min-w-0 space-y-2 bg-card p-4 sm:p-5">
        <Skeleton className="h-4 w-3/4 animate-none" /><Skeleton className="h-7 w-10 animate-none" />
      </div>)}
    </div>}>
      {summary && <dl className={grid} aria-label="Resumo dos usuários cadastrados">
        {summaryItems.map(([key, label]) => <div key={key} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
          <dt className="text-pretty text-sm text-muted-foreground">{label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{count.format(summary[key])}</dd>
        </div>)}
      </dl>}
    </SkeletonReveal>
  );
}

function DirectoryFilters({ query, filtered, onChange }: { query: ClientUserQuery; filtered: boolean; onChange: (query: ClientUserQuery) => void }) {
  const [draft, setDraft] = useState({ search: query.search, value: query.search });
  const input = useRef<HTMLInputElement>(null);
  const search = draft.search === query.search ? draft.value : query.search;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = companySearch.safeParse(search);
    if (!parsed.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ search: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar usuários credenciados" onSubmit={submit} className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2 sm:col-span-2 xl:col-span-1">
          <label htmlFor="directory-search" className="text-sm font-medium">Buscar usuário</label>
          <div className="flex min-w-0 gap-2">
            <Input id="directory-search" ref={input} type="search" autoComplete="off" maxLength={120} className="h-11 min-w-0"
              placeholder="Nome, e-mail ou empresa" value={search} onChange={(event) => setDraft({ search: query.search, value: event.target.value })} />
            <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Pesquisar usuários"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="directory-role" className="text-sm font-medium">Perfil de acesso</span>
          <GlideSelect aria-labelledby="directory-role" size="lg" value={query.role} options={roles} menuWidth={208}
            onChange={(role) => onChange({ ...query, role: clientUserRoleFilter.parse(role), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="directory-status" className="text-sm font-medium">Situação do acesso</span>
          <GlideSelect aria-labelledby="directory-status" size="lg" value={query.status} options={statuses} menuWidth={224}
            onChange={(status) => onChange({ ...query, status: companyStatusFilter.parse(status), page: 1 })} />
        </div>
      </div>
      {filtered && <Button type="button" variant="ghost" className="h-11 w-fit" onClick={() => {
        setDraft({ search: "", value: "" });
        onChange(defaultQuery);
        input.current?.focus();
      }}>Limpar filtros</Button>}
    </form>
  );
}

type OpenUser = (id: string, trigger: HTMLButtonElement) => void;

function OpenUserButton({ member, openUser }: { member: ClientUser; openUser: OpenUser }) {
  return <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground" aria-haspopup="dialog"
    aria-label={`Ver detalhes de ${member.name}`} onClick={(event) => openUser(member.id, event.currentTarget)}>
    <ChevronRight aria-hidden="true" />
  </Button>;
}

function CompanyName({ company }: Pick<ClientUser, "company">) {
  return company ? <span className="wrap-anywhere text-sm">{company.tradeName ?? company.legalName}</span>
    : <span className="text-sm text-muted-foreground">Sem vínculo</span>;
}

function DirectoryRows({ items, openUser }: { items: ClientUser[]; openUser: OpenUser }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Usuários credenciados" className="table-fixed">
          <colgroup><col className="w-[28%]" /><col className="w-[22%]" /><col className="w-[12%]" /><col className="w-[16%]" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Usuário</TableHead><TableHead scope="col">Empresa</TableHead>
              <TableHead scope="col">Perfil</TableHead><TableHead scope="col">Situação</TableHead><TableHead scope="col">Último login</TableHead>
              <TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((member) => <TableRow key={member.id}>
            <TableCell className="py-3 pl-5"><UserIdentity name={member.name} email={member.email} /></TableCell>
            <TableCell className="whitespace-normal py-3"><CompanyName company={member.company} /></TableCell>
            <TableCell className="whitespace-normal py-3 text-sm">{clientUserRoleLabels[member.role]}</TableCell>
            <TableCell className="whitespace-normal py-3"><CompanyAccessBadge status={member.status} /></TableCell>
            <TableCell className="whitespace-normal py-3 text-sm"><AdminMemberLogin lastLoginAt={member.lastLoginAt} /></TableCell>
            <TableCell className="px-2 py-2 text-right"><OpenUserButton member={member} openUser={openUser} /></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </div>
      <ul aria-label="Usuários credenciados" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((member) => <li key={member.id} className="grid min-w-0 gap-3 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <UserIdentity name={member.name} email={member.email} /><OpenUserButton member={member} openUser={openUser} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm"><span>{clientUserRoleLabels[member.role]}</span><CompanyAccessBadge status={member.status} /></div>
          <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm">
            <div className="min-w-0"><dt className="mb-0.5 text-xs text-muted-foreground">Empresa</dt><dd><CompanyName company={member.company} /></dd></div>
            <div className="min-w-0"><dt className="mb-0.5 text-xs text-muted-foreground">Último login</dt><dd><AdminMemberLogin lastLoginAt={member.lastLoginAt} /></dd></div>
          </dl>
        </li>)}
      </ul>
    </>
  );
}

function DirectorySkeleton() {
  return <div className="divide-y divide-border">{[1, 2, 3, 4].map((row) => <div key={row} className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
    <Skeleton className="size-10 shrink-0 animate-none rounded-full" />
    <div className="w-2/5 space-y-2"><Skeleton className="h-4 w-4/5 animate-none" /><Skeleton className="h-3 w-3/5 animate-none" /></div>
    <Skeleton className="ml-auto h-5 w-20 animate-none" />
  </div>)}</div>;
}

export function AdminClientUsersScreen({ user }: { user: AdminIdentity }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const detailsTrigger = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<{ id: string; open: boolean } | null>(null);
  const query = clientUserQueryFrom(useSearchParams());
  const filterKey = clientUsersHref({ ...query, page: 1 });
  const filtered = Boolean(query.search || query.role !== "ALL" || query.status !== "ALL");
  const result = useQuery({
    queryKey: ["admin-client-users", user.id, filterKey, query.page],
    queryFn: ({ signal }) => adminClientUsers.list(query, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === user.id && previous.queryKey[2] === filterKey ? data : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const report = denied ? undefined : result.data;
  const loading = result.isPending || result.isPlaceholderData;

  function navigate(next: ClientUserQuery) {
    window.history.replaceState(null, "", clientUsersHref(next));
  }

  const openUser: OpenUser = (id, trigger) => {
    detailsTrigger.current = trigger;
    setSelected({ id, open: true });
  };

  function restoreFocus(event: Event) {
    event.preventDefault();
    const trigger = detailsTrigger.current;
    if (trigger?.isConnected && trigger.offsetWidth > 0) trigger.focus();
    else heading.current?.focus();
    setSelected(null);
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Usuários Credenciados</h1>
        <p className="text-pretty text-sm text-muted-foreground">Consulte os usuários dos clientes, suas empresas e a situação de acesso ao Slopay.</p>
      </header>
      {(result.isPending || report) && <DirectorySummary summary={report?.summary} loading={result.isPending} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="directory-users">
        <header className="px-4 py-4 sm:px-5"><h2 id="directory-users" className="text-balance text-lg font-semibold">Diretório de usuários</h2></header>
        <DirectoryFilters query={query} filtered={filtered} onChange={navigate} />
        {loading && <span role="status" className="sr-only">Carregando usuários credenciados</span>}
        <SkeletonReveal flow revealed={!loading} skeleton={<DirectorySkeleton />}>
          {report?.items.length ? <DirectoryRows items={report.items} openUser={openUser} /> : report ? (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">{filtered ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}</h3>
              {filtered ? <Button type="button" variant="outline" className="h-11" onClick={() => navigate(defaultQuery)}>Mostrar todos os usuários</Button>
                : <Button asChild variant="outline" className="h-11"><Link href={openingsPath} prefetch={false}>Ver aberturas de conta</Link></Button>}
            </div>
          ) : result.isError && (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Consulta de usuários indisponível</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
        {report && report.pagination.total > 0 && <TablePagination {...report.pagination} busy={loading} label="Paginação dos usuários"
          onPageChange={(page) => navigate({ ...query, page })} />}
      </Card>
      {selected && <AdminClientUserDialog key={selected.id} id={selected.id} adminId={user.id} open={selected.open}
        onOpenChange={(open) => setSelected({ id: selected.id, open })} onCloseAutoFocus={restoreFocus}
        onDeleted={() => { detailsTrigger.current = null; }} />}
    </AdminPanel>
  );
}
