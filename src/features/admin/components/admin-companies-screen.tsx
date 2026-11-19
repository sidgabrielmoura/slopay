"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDevelopmentFeatures } from "@/providers/app-providers";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Building2, Search } from "lucide-react";
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
import { openingsPath } from "../account-openings";
import {
  adminCompanies, companiesPath, companiesQueryFrom, companyListParams, companyPeriod, companyPeriodLabels,
  companySearch, companyStatusFilter, companyStatusLabels, type CompaniesQuery, type CompanyListItem,
} from "../admin-companies";
import { retryAdminRead } from "../admin-query";
import { CompanyAccessBadge, CompanyField, CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const statusOptions = companyStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todos os acessos" : companyStatusLabels[value],
}));
const periodOptions = companyPeriod.options.map((value) => ({ value, label: companyPeriodLabels[value] }));

export function AdminCompaniesScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const filters = companiesQueryFrom(useSearchParams());
  const { status, period, search, page } = filters;
  const [draft, setDraft] = useState(search);
  const result = useQuery({
    queryKey: ["admin-companies", user.id, status, period, search, page],
    queryFn: ({ signal }) => adminCompanies.list(filters, signal),
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
    placeholderData: (previous, query) => query?.queryKey[2] === status &&
      query.queryKey[3] === period && query.queryKey[4] === search ? previous : undefined,
  });
  const data = result.data;
  const filtered = status !== "ALL" || period !== "all" || Boolean(search);

  function navigate(next: CompaniesQuery) {
    window.history.replaceState(null, "", companiesPath + companyListParams(next));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = companySearch.safeParse(draft);
    if (!value.success) { toast.error("Confira o texto da busca."); return; }
    navigate({ ...filters, search: value.data, page: 1 });
  }

  function reset() {
    setDraft("");
    navigate({ search: "", status: "ALL", period: "all", page: 1 });
  }

  return (
    <AdminPanel user={user}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Empresas</h1>
          <p className="text-pretty text-sm text-muted-foreground">Consulte os cadastros e gerencie o acesso dos titulares.</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href={openingsPath} prefetch={false}>Abertura de contas <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </header>

      <form role="search" aria-label="Filtrar empresas" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex xl:items-end" onSubmit={submitSearch}>
        <div className="grid min-w-0 gap-2 sm:col-span-2 xl:flex-1">
          <label htmlFor="company-search" className="text-sm font-medium">Buscar empresa</label>
          <Input id="company-search" type="search" className="h-11" maxLength={120} value={draft}
            placeholder="Nome, CNPJ ou titular" onChange={(event) => setDraft(event.target.value)} />
        </div>
        <div className="grid min-w-0 gap-2 xl:w-40">
          <span className="text-sm font-medium">Acesso</span>
          <GlideSelect ariaLabel="Situação do acesso" options={statusOptions} value={status} size="lg"
            onChange={(value) => navigate({ ...filters, status: companyStatusFilter.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2 xl:w-44">
          <span className="text-sm font-medium">Data de cadastro</span>
          <GlideSelect ariaLabel="Período de cadastro" options={periodOptions} value={period} size="lg"
            onChange={(value) => navigate({ ...filters, period: companyPeriod.parse(value), page: 1 })} />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" variant="outline" className="h-11"><Search aria-hidden="true" />Buscar</Button>
          {filtered && <Button type="button" variant="ghost" className="h-11" onClick={reset}>Limpar filtros</Button>}
        </div>
      </form>

      <ToastNotice message={result.isError ? result.error.message : null} />
      {result.isPending && <p role="status" className="sr-only">Carregando empresas</p>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={<CompaniesSkeleton />}>
        {data ? (
          <div className="grid min-w-0 gap-5">
            <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border", development ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
              {([
                ["Empresas cadastradas", data.summary.total], ["Com vínculo Sandbox", data.summary.linked],
                ["Acessos ativos", data.summary.active], ["Acessos suspensos", data.summary.suspended],
              ] as const).filter(([label]) => development || label !== "Com vínculo Sandbox").map(([label, value]) => (
                <section key={label} className="min-w-0 bg-card p-4 sm:p-5">
                  <h2 className="text-balance text-xs font-medium text-muted-foreground sm:text-sm">{label}</h2>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{count.format(value)}</p>
                </section>
              ))}
            </div>
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="gap-1 p-5">
                <h2 className="text-balance text-lg font-semibold">Lista de empresas</h2>
                {development && <p className="text-pretty text-sm text-muted-foreground">O volume soma recebimentos e saques Pix confirmados no Sandbox.</p>}
              </CardHeader>
              <div aria-busy={result.isPlaceholderData}>
                {data.items.length > 0 ? (
                  <CompanyRows entries={data.items} query={{ ...filters, page: data.pagination.page }} />
                ) : (
                  <div className="grid justify-items-center gap-3 border-t border-border px-5 py-10 text-center">
                    <Building2 aria-hidden="true" className="size-8 text-muted-foreground" />
                    <h3 className="text-balance font-medium">{filtered ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}</h3>
                    {filtered ? (
                      <Button variant="outline" type="button" className="h-11" onClick={reset}>Limpar filtros</Button>
                    ) : (
                      <Button asChild variant="outline" className="h-11"><Link href={openingsPath}>Consultar abertura de contas</Link></Button>
                    )}
                  </div>
                )}
              </div>
              <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação das empresas"
                onPageChange={(nextPage) => navigate({ ...filters, page: nextPage })} />
            </Card>
          </div>
        ) : result.isError && <CompanyReadError title="Empresas indisponíveis" retry={() => void result.refetch()} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}

function CompaniesSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
        {[1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-24 animate-none rounded-none" />)}
      </div>
      <CompanyRowsSkeleton />
    </div>
  );
}

function CompanyName({ entry, query }: { entry: CompanyListItem; query: CompaniesQuery }) {
  return (
    <div className="grid min-w-0 gap-1">
      <Link href={`${companiesPath}/${entry.id}${companyListParams(query)}`} prefetch={false}
        className="inline-flex min-h-11 min-w-0 items-center gap-2 font-semibold hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring xl:min-h-0">
        <span className="min-w-0 wrap-anywhere">{entry.tradeName ?? entry.legalName}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
      <span className="text-xs tabular-nums text-muted-foreground">{entry.cnpj ? formatCNPJ(entry.cnpj) : "Pessoa física"}</span>
    </div>
  );
}

function CompanyRows({ entries, query }: { entries: CompanyListItem[]; query: CompaniesQuery }) {
  const development = useDevelopmentFeatures();
  return (
    <>
      <table className="hidden w-full table-fixed border-t border-border text-left text-sm xl:table">
        <caption className="sr-only">Cadastro de empresas</caption>
        <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
          <tr>
            <th scope="col" className="w-[29%] px-5 py-3">Empresa</th>
            <th scope="col" className="w-[21%] px-3 py-3">Titular</th>
            {development && <th scope="col" className="w-[16%] px-3 py-3">Vínculo</th>}
            <th scope="col" className="w-[16%] px-3 py-3">Acesso</th>
            {development && <th scope="col" className="w-[18%] px-5 py-3 text-right">Volume Pix</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-muted/30">
              <td className="px-5 py-3"><CompanyName entry={entry} query={query} /></td>
              <td className="wrap-anywhere px-3 py-3">{entry.ownerName}</td>
              {development && <td className="px-3 py-3"><Badge variant={entry.linked ? "info" : "secondary"}>{entry.linked ? "Sandbox" : "Sem vínculo"}</Badge></td>}
              <td className="px-3 py-3"><CompanyAccessBadge status={entry.accessStatus} /></td>
              {development && <td className="wrap-anywhere px-5 py-3 text-right font-medium tabular-nums"><PanelAmount cents={entry.volumeCents} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
      <ul aria-label="Cadastro de empresas" className="divide-y divide-border border-t border-border xl:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="grid min-w-0 gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CompanyName entry={entry} query={query} />
              <CompanyAccessBadge status={entry.accessStatus} />
            </div>
            <dl className="grid min-w-0 grid-cols-2 gap-3">
              <CompanyField label="Titular">{entry.ownerName}</CompanyField>
              <CompanyField label="Cadastro"><span className="tabular-nums">{formatDateTime(entry.createdAt, "date-only")}</span></CompanyField>
              {development && <>
                <CompanyField label="Vínculo">{entry.linked ? "Sandbox" : "Sem vínculo"}</CompanyField>
                <CompanyField label="Volume Pix"><PanelAmount cents={entry.volumeCents} /></CompanyField>
              </>}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
