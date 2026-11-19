"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDevelopmentFeatures } from "@/providers/app-providers";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ClipboardList, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import {
  accountOpenings, openingFilter, openingParams, openingQueryFrom, openingSearch, openingStatusLabels,
  openingsPath, type OpeningItem, type OpeningQuery,
} from "../account-openings";
import { retryAdminRead } from "../admin-query";
import { AccountOpeningStatus } from "./account-opening-status";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const filters = openingFilter.options.map(value => ({ value, label: value === "ALL" ? "Todas as situações" : openingStatusLabels[value] }));

function ListSkeleton() {
  return (
    <div className="grid gap-5" aria-hidden="true">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 animate-none rounded-none" />)}
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Skeleton className="h-14 animate-none rounded-none" />
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-17 animate-none rounded-none" />)}
      </div>
    </div>
  );
}

export function AdminAccountOpeningsScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const requestedQuery = openingQueryFrom(useSearchParams());
  const query = !development && (requestedQuery.status === "PILOT" || requestedQuery.status === "LINKED")
    ? { ...requestedQuery, status: "ALL" as const, page: 1 } : requestedQuery;
  const [draft, setDraft] = useState(query.search);
  const { status, search, page } = query;
  const result = useQuery({
    queryKey: ["admin-account-openings", user.id, status, search, page],
    queryFn: ({ signal }) => accountOpenings.list(query, signal),
    placeholderData: (previous, previousQuery) => (
      previousQuery?.queryKey[2] === status && previousQuery.queryKey[3] === search ? previous : undefined
    ),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: retryAdminRead,
  });
  const data = result.data;
  const filtering = status !== "ALL" || Boolean(search);

  function updateQuery(next: OpeningQuery) {
    window.history.replaceState(null, "", openingsPath + openingParams(next));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = openingSearch.safeParse(draft);
    if (!value.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    updateQuery({ ...query, search: value.data, page: 1 });
  }

  function clear() {
    setDraft("");
    updateQuery({ status: "ALL", search: "", page: 1 });
  }

  return (
    <AdminPanel user={user}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Abertura de contas</h1>
            {development && <Badge variant="secondary">Sandbox</Badge>}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Analise os cadastros dos titulares e acompanhe as solicitações.</p>
        </div>
        <Button type="button" variant="outline" className="h-11" disabled={result.isFetching} onClick={() => void result.refetch()}>
          {result.isFetching ? <LoadingIndicator /> : <RotateCw aria-hidden="true" />}
          Atualizar cadastros
        </Button>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" role="search" aria-label="Buscar cadastros" onSubmit={submitSearch}>
        <div className="grid min-w-0 gap-2 sm:w-56 sm:shrink-0">
          <span className="text-sm font-medium">Situação</span>
          <GlideSelect ariaLabel="Situação do cadastro"
            options={development ? filters : filters.filter(({ value }) => value !== "PILOT" && value !== "LINKED")} value={status} size="lg"
            onChange={(value) => updateQuery({ ...query, status: openingFilter.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 flex-1 gap-2">
          <label className="text-sm font-medium" htmlFor="account-opening-search">Buscar cadastro</label>
          <Input id="account-opening-search" type="search" value={draft} maxLength={120} className="h-11"
            placeholder="Titular, empresa, e-mail ou CNPJ" onChange={(event) => setDraft(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" className="h-11"><Search aria-hidden="true" />Buscar</Button>
          {filtering && <Button type="button" variant="ghost" className="h-11" onClick={clear}>Limpar filtros</Button>}
        </div>
      </form>

      <ToastNotice message={result.isError ? result.error.message : null} />
      {result.isPending && <p role="status" className="sr-only">Carregando cadastros</p>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={<ListSkeleton />}>
        {data ? (
          <div className="grid min-w-0 gap-5">
            <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border", development ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
              <Metric label="Cadastros" value={data.summary.total} />
              <Metric label="Aguardando titular" value={data.summary.waitingForOwner} />
              <Metric label="Com a equipe" value={data.summary.actionable} />
              {development && <Metric label="Empresas vinculadas" value={data.summary.linked} />}
            </div>
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="gap-1 p-5">
                <h2 className="text-balance text-lg font-semibold">Cadastros de titulares</h2>
                <p className="text-pretty text-sm text-muted-foreground">Do mais recente ao mais antigo.</p>
              </CardHeader>
              <div aria-busy={result.isPlaceholderData}>
                {data.items.length ? <OpeningRows items={data.items} query={{ ...query, page: data.pagination.page }} /> : (
                  <div className="grid justify-items-center gap-3 border-t border-border px-5 py-12 text-center">
                    <ClipboardList aria-hidden="true" className="size-8 text-muted-foreground" />
                    <h3 className="text-balance font-medium">{filtering ? "Nenhum cadastro encontrado" : "Nenhum cadastro recebido"}</h3>
                    <p className="text-pretty text-sm text-muted-foreground">
                      {filtering ? "Ajuste a busca ou a situação selecionada." : "Os titulares aparecem aqui após se cadastrarem no Slopay."}
                    </p>
                    <Button variant="outline" className="h-11" type="button" onClick={filtering ? clear : () => void result.refetch()}>
                      {filtering ? "Limpar filtros" : "Consultar novamente"}
                    </Button>
                  </div>
                )}
              </div>
              <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação dos cadastros"
                onPageChange={(nextPage) => updateQuery({ ...query, page: nextPage })} />
            </Card>
          </div>
        ) : result.isError && (
          <Card className="grid min-h-64 content-center justify-items-center gap-4 p-6 text-center">
            <h2 className="text-balance text-lg font-semibold">Cadastros indisponíveis</h2>
            <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
          </Card>
        )}
      </SkeletonReveal>
    </AdminPanel>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="min-w-0 bg-card p-4 sm:p-5">
      <h2 className="text-balance text-xs font-medium text-muted-foreground sm:text-sm">{label}</h2>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{count.format(value)}</p>
    </section>
  );
}

function OpeningRows({ items, query }: { items: OpeningItem[]; query: OpeningQuery }) {
  const suffix = openingParams(query);
  return (
    <>
      <table className="hidden w-full table-fixed border-t border-border text-left text-sm xl:table">
        <caption className="sr-only">Titulares cadastrados e situação da abertura de conta</caption>
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-6/25 px-5 py-3 font-medium">Titular</th>
            <th scope="col" className="w-5/25 px-4 py-3 font-medium">Empresa</th>
            <th scope="col" className="w-5/25 px-4 py-3 font-medium">Situação</th>
            <th scope="col" className="w-4/25 px-4 py-3 font-medium">Analista</th>
            <th scope="col" className="px-4 py-3 font-medium">Cadastro</th>
            <th scope="col" className="w-17"><span className="sr-only">Detalhes</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/40">
              <td className="px-5 py-3">
                <p className="truncate font-medium">{item.ownerName}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{item.ownerEmail}</p>
              </td>
              <td className="px-4 py-3">
                <p className="truncate">{item.legalName ?? "—"}</p>
                {item.cnpj && <p className="mt-1 truncate text-xs tabular-nums text-muted-foreground">{formatCNPJ(item.cnpj)}</p>}
              </td>
              <td className="px-4 py-3"><AccountOpeningStatus status={item.status} /></td>
              <td className="truncate px-4 py-3 text-muted-foreground">{item.analystName ?? "—"}</td>
              <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt, "date-only")}</time>
              </td>
              <td className="px-3 py-3">
                <Button asChild size="icon" variant="ghost" className="size-11">
                  <Link href={openingsPath + "/" + item.id + suffix} prefetch={false} aria-label={`Abrir cadastro de ${item.ownerName}`}>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-border border-t border-border xl:hidden">
        {items.map(item => (
          <li key={item.id}>
            <Link href={openingsPath + "/" + item.id + suffix} prefetch={false} aria-label={`Abrir cadastro de ${item.ownerName}`}
              className="grid min-w-0 gap-2 px-5 py-4 hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.ownerName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{item.legalName ?? item.ownerEmail}</p>
                </div>
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AccountOpeningStatus status={item.status} />
                <time dateTime={item.createdAt} className="text-xs tabular-nums text-muted-foreground">{formatDateTime(item.createdAt, "date-only")}</time>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
