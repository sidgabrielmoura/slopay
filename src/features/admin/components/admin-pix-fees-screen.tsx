"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { asaasPixLimitsHelp } from "@/features/account/pix-conditions";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { globalStatementPath } from "../admin-global-statement";
import { operationalAccountsPath, operationalSearch } from "../admin-operational-accounts";
import {
  adminPixFees, adminPixFeesListKey, adminPixFeesPath, adminPixFeesQuery, pixFeeCoverage, pixFeesParams,
  pixFeesQueryFrom, type PixFeeLimits, type PixFeeWallet, type PixFeesQuery,
} from "../admin-pix-fees";
import { retryAdminRead } from "../admin-query";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const defaultQuery = adminPixFeesQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 4 });
const coverageOptions = [
  { value: "ALL", label: "Todas as carteiras" },
  { value: "RECORDED", label: "Com tarifas registradas" },
  { value: "MISSING", label: "Aguardando consulta" },
];

function FeeFilters({ query, onChange }: { query: PixFeesQuery; onChange: (next: PixFeesQuery) => void }) {
  const [draft, setDraft] = useState({ searched: query.search, value: query.search });
  const input = useRef<HTMLInputElement>(null);
  const value = draft.searched === query.search ? draft.value : query.search;

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = operationalSearch.safeParse(value);
    if (!parsed.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ searched: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar tarifas por carteira" onSubmit={search}
      className="grid gap-3 border-y border-border px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:px-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,15rem)]">
      <div className="grid min-w-0 gap-2">
        <label htmlFor="pix-fees-search" className="text-sm font-medium">Buscar carteira</label>
        <div className="flex min-w-0 gap-2">
          <Input id="pix-fees-search" ref={input} type="search" className="h-11 min-w-0" maxLength={120}
            placeholder="Empresa, CNPJ ou carteira" autoComplete="off" value={value}
            onChange={(event) => setDraft({ searched: query.search, value: event.target.value })} />
          <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar carteira">
            <Search aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="pix-fees-coverage" className="text-sm font-medium">Situação da consulta</span>
        <GlideSelect aria-labelledby="pix-fees-coverage" size="lg" menuWidth={224} options={coverageOptions} value={query.coverage}
          onChange={(coverage) => onChange({ ...query, coverage: pixFeeCoverage.parse(coverage), page: 1 })} />
      </div>
      {(query.search || query.coverage !== "ALL") && (
        <Button type="button" variant="ghost" size="sm" className="-ml-2 h-11 w-fit" onClick={() => {
          setDraft({ searched: "", value: "" });
          onChange(defaultQuery);
          input.current?.focus();
        }}>Limpar filtros</Button>
      )}
    </form>
  );
}

function AppliedLimits({ limits, loading }: { limits?: PixFeeLimits; loading: boolean }) {
  const cell = "min-w-0 space-y-1 bg-card px-4 py-4 sm:px-5";
  const grid = "grid min-w-0 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3";
  const batch = limits?.pilotBatchLimits;
  const development = useDevelopmentFeatures();
  return (
    <section aria-labelledby="pix-fee-limits" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="space-y-1">
          <h2 id="pix-fee-limits" className="text-balance text-lg font-semibold">Limites de operação</h2>
          <p className="text-pretty text-sm text-muted-foreground">Os valores por horário e por transação ficam em Pix → Meus limites no Asaas.</p>
        </div>
        <Button asChild variant="ghost" className="h-11">
          <a href={asaasPixLimitsHelp} target="_blank" rel="noreferrer">Como consultar <ArrowUpRight aria-hidden="true" /></a>
        </Button>
      </div>
      <SkeletonReveal flow revealed={!loading} skeleton={
        <div className={grid}>{[1, 2, 3].map((index) => (
          <div className={cell} key={index}>
            <Skeleton className="mb-2 h-4 w-32 max-w-full animate-none" /><Skeleton className="h-6 w-24 animate-none" />
          </div>
        ))}</div>
      }>
        {limits && <dl className={grid}>
          <div className={cell}>
            <dt className="text-sm text-muted-foreground">Mínimo por cobrança Pix</dt>
            <dd className="text-xl font-semibold tabular-nums"><PanelAmount cents={limits.minimumChargeInCents} /></dd>
          </div>
          <div className={cell}>
            <dt className="text-sm text-muted-foreground">Disponibilidade para saque</dt>
            <dd className="text-lg font-semibold">Saldo da carteira</dd>
            <dd className="text-pretty text-xs text-muted-foreground">O valor e a tarifa precisam caber no saldo.</dd>
          </div>
          <div className={cell}>
            <dt className="text-sm text-muted-foreground">Limite de itens por lote</dt>
            <dd className="text-lg font-semibold tabular-nums">
              {batch ? count.format(batch.minimum) + " a " + count.format(batch.maximum) + " Pix por lote" : "Indisponível"}
            </dd>
          </div>
          {!development && ([
            ["Máximo por cobrança Pix", limits.maxChargeInCents],
            ["Máximo por saque ou lote", limits.maxWithdrawalInCents],
            ["Máximo diário por titular", limits.maxDailyWithdrawalInCents],
          ] as const).map(([label, value]) => (
            <div className={cell} key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value ? <PanelAmount cents={value} /> : "Indisponível"}</dd>
            </div>
          ))}
        </dl>}
      </SkeletonReveal>
    </section>
  );
}

function WalletIdentity({ item }: { item: PixFeeWallet }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="wrap-anywhere font-medium">{item.companyName}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{item.cnpj ? formatCNPJ(item.cnpj) + " · " : ""}Final {item.walletSuffix}</p>
    </div>
  );
}

function BaseFee({ item, direction }: { item: PixFeeWallet; direction: "receive" | "withdraw" }) {
  const fixed = direction === "receive" ? item.fees?.receipt?.fixedInCents : item.fees?.transfer?.feeInCents;
  const rate = direction === "receive" ? item.fees?.receipt?.percentage : null;
  const showRate = rate != null && (rate > 0 || fixed == null);
  if (fixed == null && !showRate) return <span className="text-muted-foreground" aria-label="Tarifa base indisponível">—</span>;
  return (
    <span className="flex flex-wrap gap-x-2 font-medium tabular-nums">
      {fixed != null && <span><PanelAmount cents={fixed} /></span>}
      {showRate && <span className={fixed == null ? undefined : "text-muted-foreground"}>{percent.format(rate / 100)}</span>}
    </span>
  );
}

function FeeCheckedAt({ checkedAt }: { checkedAt: PixFeeWallet["checkedAt"] }) {
  return checkedAt ? (
    <time className="text-sm text-muted-foreground tabular-nums" dateTime={checkedAt}>{formatDateTime(checkedAt)}</time>
  ) : <Badge variant="secondary">Sem consulta</Badge>;
}

function OpenFeeWallet({ item, query }: { item: PixFeeWallet; query: PixFeesQuery }) {
  return (
    <Button asChild variant="ghost" size="icon" className="size-11 shrink-0">
      <Link prefetch={false} href={adminPixFeesPath + "/" + item.id + pixFeesParams(query)} aria-label={"Ver tarifas de " + item.companyName}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

function FeeRows({ items, query }: { items: PixFeeWallet[]; query: PixFeesQuery }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table className="table-fixed">
          <caption className="sr-only">Tarifas base por carteira</caption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[36%] pl-5">Empresa e carteira</TableHead>
              <TableHead>Recebimento Pix</TableHead>
              <TableHead>Saque Pix</TableHead>
              <TableHead>Última consulta</TableHead>
              <TableHead className="w-16"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-normal py-3 pl-5"><WalletIdentity item={item} /></TableCell>
              <TableCell className="whitespace-normal"><BaseFee item={item} direction="receive" /></TableCell>
              <TableCell className="whitespace-normal"><BaseFee item={item} direction="withdraw" /></TableCell>
              <TableCell className="whitespace-normal"><FeeCheckedAt checkedAt={item.checkedAt} /></TableCell>
              <TableCell><OpenFeeWallet item={item} query={query} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Tarifas base por carteira" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((item) => (
          <li key={item.id} className="grid gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <WalletIdentity item={item} /><OpenFeeWallet item={item} query={query} />
            </div>
            <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm">
              <div><dt className="mb-0.5 text-xs text-muted-foreground">Recebimento Pix</dt><dd><BaseFee item={item} direction="receive" /></dd></div>
              <div><dt className="mb-0.5 text-xs text-muted-foreground">Saque Pix</dt><dd><BaseFee item={item} direction="withdraw" /></dd></div>
              <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <dt className="text-xs text-muted-foreground">Última consulta</dt><dd><FeeCheckedAt checkedAt={item.checkedAt} /></dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminPixFeesScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const query = pixFeesQueryFrom(useSearchParams());
  const filters = pixFeesParams({ ...query, page: 1 });
  const filtered = Boolean(filters);
  const result = useQuery({
    queryKey: [...adminPixFeesListKey(user.id), filters, query.page],
    queryFn: ({ signal }) => adminPixFees.list(query, signal),
    placeholderData: (previous, prior) => prior?.queryKey[1] === user.id && prior.queryKey[2] === filters ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = denied ? undefined : result.data;
  const loading = result.isLoading || result.isPlaceholderData;

  function navigate(next: PixFeesQuery) {
    window.history.replaceState(null, "", adminPixFeesPath + pixFeesParams(next));
  }

  return (
    <AdminPanel user={user}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Taxas e limites</h1>
            {development && <Badge variant="secondary">Sandbox</Badge>}
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Consulte as tarifas das carteiras vinculadas e as regras de operação do Pix.</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href={globalStatementPath + "?type=FEE_DEBIT"} prefetch={false}>Extrato de tarifas <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </header>
      {(result.isLoading || data) && <AppliedLimits limits={data?.limits} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="pix-fees-wallets">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
          <div className="space-y-1">
            <h2 id="pix-fees-wallets" className="text-balance text-lg font-semibold">Tarifas por carteira</h2>
            <p className="text-pretty text-sm text-muted-foreground">Abra uma carteira para consultar o Asaas ou ver descontos e franquias registrados.</p>
          </div>
          {data && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {count.format(data.summary.checked)} de {count.format(data.summary.total)} com tarifas registradas
            </p>
          )}
        </header>
        <FeeFilters query={query} onChange={navigate} />
        {loading && <span role="status" className="sr-only">Carregando tarifas das carteiras</span>}
        <SkeletonReveal flow revealed={!loading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {data?.items.length ? <FeeRows items={data.items} query={{ ...query, page: data.pagination.page }} /> : data ? (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">{filtered ? "Nenhuma carteira para os filtros selecionados" : "Nenhuma carteira vinculada"}</h3>
              {filtered ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => navigate(defaultQuery)}>Mostrar todas as carteiras</Button>
              ) : (
                <Button asChild variant="outline" className="h-11"><Link href={operationalAccountsPath} prefetch={false}>Ver contas operacionais</Link></Button>
              )}
            </div>
          ) : result.isError && (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Consulta de tarifas indisponível</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
        {data && data.pagination.total > 0 && <TablePagination {...data.pagination} busy={loading}
          label="Paginação das tarifas" onPageChange={(page) => navigate({ ...query, page })} />}
      </Card>
    </AdminPanel>
  );
}
