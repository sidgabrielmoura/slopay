"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { companiesPath } from "../admin-companies";
import { retryAdminRead } from "../admin-query";
import {
  adminOperationalAccounts, operationalAccountsPath, operationalParams, operationalQueryFrom,
  operationalSearch, operationalStatusFilter, operationalStatusLabels,
  type OperationalListItem, type OperationalQuery, type OperationalStatus,
} from "../admin-operational-accounts";
import { CompanyField, CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const statuses = operationalStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : operationalStatusLabels[value],
}));
const variants = { ACTIVE: "success", PAUSED: "warning", RESTRICTED: "secondary" } as const;

export function OperationalStatusBadge({ status }: { status: OperationalStatus }) {
  return <Badge variant={variants[status]}>{operationalStatusLabels[status]}</Badge>;
}

export function AdminOperationalAccountsScreen({ user }: { user: AdminIdentity }) {
  const query = operationalQueryFrom(useSearchParams());
  const { search, status, page } = query;
  const [draft, setDraft] = useState(search);
  const result = useQuery({
    queryKey: ["admin-operational-accounts", user.id, status, search, page],
    queryFn: ({ signal }) => adminOperationalAccounts.list(query, signal),
    placeholderData: (previous, prior) => prior?.queryKey[2] === status && prior.queryKey[3] === search ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const data = result.data;
  const filtered = Boolean(search) || status !== "ALL";

  function navigate(next: OperationalQuery) {
    window.history.replaceState(null, "", operationalAccountsPath + operationalParams(next));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchInput = operationalSearch.safeParse(draft);
    if (!searchInput.success) { toast.error("Confira o texto da busca."); return; }
    navigate({ ...query, search: searchInput.data, page: 1 });
  }

  function clear() {
    setDraft("");
    navigate({ search: "", status: "ALL", page: 1 });
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Contas operacionais</h1>
          <Badge variant="secondary">Sandbox</Badge>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Consulte as carteiras Pix vinculadas às empresas e acompanhe cada posição.</p>
      </header>

      <form role="search" aria-label="Filtrar contas operacionais" className="flex min-w-0 flex-wrap items-end gap-3" onSubmit={submitSearch}>
        <div className="grid min-w-0 basis-full gap-2 sm:basis-52 sm:grow">
          <label htmlFor="operational-account-search" className="text-sm font-medium">Buscar conta</label>
          <Input id="operational-account-search" type="search" className="h-11" placeholder="Empresa, CNPJ ou carteira"
            value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} />
        </div>
        <div className="grid min-w-0 basis-full gap-2 sm:basis-52">
          <span className="text-sm font-medium">Situação</span>
          <GlideSelect ariaLabel="Situação das operações" size="lg" options={statuses} value={status}
            onChange={(value) => navigate({ ...query, status: operationalStatusFilter.parse(value), page: 1 })} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" className="h-11"><Search aria-hidden="true" />Buscar</Button>
          {filtered && <Button type="button" variant="ghost" className="h-11" onClick={clear}>Limpar filtros</Button>}
        </div>
      </form>

      <ToastNotice message={result.isError ? result.error.message : null} />
      {result.isPending && <p role="status" className="sr-only">Carregando contas</p>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 animate-none rounded-none" />)}
          </div>
          <CompanyRowsSkeleton />
        </div>
      }>
        {data ? <div className="grid min-w-0 gap-5">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
            {([
              ["Contas vinculadas", data.summary.total], ["Operações liberadas", data.summary.active],
              ["Operações pausadas", data.summary.paused], ["Acesso restrito", data.summary.restricted],
            ] as const).map(([label, value]) => (
              <section key={label} className="min-w-0 bg-card p-4 sm:p-5">
                <h2 className="text-balance text-xs font-medium text-muted-foreground sm:text-sm">{label}</h2>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{count.format(value)}</p>
              </section>
            ))}
          </div>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="gap-1 p-5">
              <h2 className="text-balance text-lg font-semibold">Carteiras vinculadas</h2>
              <p className="text-pretty text-sm text-muted-foreground">O valor exibido corresponde à última consulta de saldo registrada.</p>
            </CardHeader>
            <div aria-busy={result.isPlaceholderData}>
              {data.items.length > 0 ? <AccountRows items={data.items} query={{ ...query, page: data.pagination.page }} /> : (
                <div className="grid justify-items-center gap-3 border-t border-border px-5 py-10 text-center">
                  <Wallet aria-hidden="true" className="size-8 text-muted-foreground" />
                  <h3 className="text-balance font-medium">{filtered ? "Nenhuma conta encontrada" : "Nenhuma carteira vinculada"}</h3>
                  {filtered ? <Button type="button" variant="outline" className="h-11" onClick={clear}>Limpar filtros</Button>
                    : <Button asChild variant="outline" className="h-11"><Link href={companiesPath}>Consultar empresas</Link></Button>}
                </div>
              )}
            </div>
            <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação das contas"
              onPageChange={(nextPage) => navigate({ ...query, page: nextPage })} />
          </Card>
        </div> : result.isError && <CompanyReadError title="Contas indisponíveis" retry={() => void result.refetch()} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}

function AccountName({ entry, query }: { entry: OperationalListItem; query: OperationalQuery }) {
  return (
    <div className="grid min-w-0 gap-1">
      <Link href={`${operationalAccountsPath}/${entry.id}${operationalParams(query)}`} prefetch={false}
        className="inline-flex min-h-11 min-w-0 items-center gap-2 font-semibold hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring xl:min-h-0">
        <span className="min-w-0 wrap-anywhere">{entry.companyName}</span>
        <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      </Link>
      <span className="text-xs tabular-nums text-muted-foreground">Carteira final {entry.walletSuffix}</span>
    </div>
  );
}

function AccountBalance({ entry }: { entry: OperationalListItem }) {
  return entry.balanceInCents === null ? <span className="text-sm text-muted-foreground">Aguardando consulta</span> : (
    <div className="min-w-0 space-y-1">
      <p className="wrap-anywhere font-semibold tabular-nums"><PanelAmount cents={entry.balanceInCents} /></p>
      {entry.balanceCheckedAt && <p className="text-xs tabular-nums text-muted-foreground">{formatDateTime(entry.balanceCheckedAt, "short")}</p>}
    </div>
  );
}

function AccountRows({ items, query }: { items: OperationalListItem[]; query: OperationalQuery }) {
  return (
    <>
      <table className="hidden w-full table-fixed border-t border-border text-left text-sm xl:table">
        <caption className="sr-only">Carteiras operacionais</caption>
        <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
          <tr>
            <th scope="col" className="w-[31%] px-5 py-3">Empresa e carteira</th>
            <th scope="col" className="w-[19%] px-3 py-3">Documento</th>
            <th scope="col" className="w-[15%] px-3 py-3">Vinculada em</th>
            <th scope="col" className="w-[16%] px-3 py-3">Operações Pix</th>
            <th scope="col" className="w-[19%] px-5 py-3 text-right">Saldo disponível</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((entry) => <tr key={entry.id} className="hover:bg-muted/30">
            <td className="px-5 py-3"><AccountName entry={entry} query={query} /></td>
            <td className="wrap-anywhere px-3 py-3 tabular-nums text-muted-foreground">{entry.cnpj ? formatCNPJ(entry.cnpj) : "Pessoa física"}</td>
            <td className="px-3 py-3 tabular-nums text-muted-foreground">{formatDateTime(entry.linkedAt, "date-only")}</td>
            <td className="px-3 py-3"><OperationalStatusBadge status={entry.status} /></td>
            <td className="px-5 py-3 text-right"><AccountBalance entry={entry} /></td>
          </tr>)}
        </tbody>
      </table>
      <ul aria-label="Carteiras operacionais" className="divide-y divide-border border-t border-border xl:hidden">
        {items.map((entry) => <li key={entry.id} className="grid min-w-0 gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <AccountName entry={entry} query={query} /><OperationalStatusBadge status={entry.status} />
          </div>
          <dl className="grid min-w-0 grid-cols-2 gap-3">
            <CompanyField label="Documento"><span className="tabular-nums">{entry.cnpj ? formatCNPJ(entry.cnpj) : "Pessoa física"}</span></CompanyField>
            <CompanyField label="Saldo disponível"><AccountBalance entry={entry} /></CompanyField>
          </dl>
        </li>)}
      </ul>
    </>
  );
}
