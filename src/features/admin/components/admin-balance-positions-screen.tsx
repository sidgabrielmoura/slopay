"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
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
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  balanceCoverage, balancePositionsHref, balancePositionsParams, balancePositionsQuery, balancePositionsQueryFrom,
  balancePositionsQueryKey, fetchBalancePositions, type BalancePosition, type BalancePositionsQuery, type BalancePositionsReport,
} from "../admin-balance-positions";
import { operationalAccountsPath, operationalSearch, operationalStatusFilter, operationalStatusLabels } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { OperationalStatusBadge } from "./admin-operational-accounts-screen";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const initialQuery = balancePositionsQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const statuses = operationalStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : operationalStatusLabels[value],
}));
const coverageOptions = [
  { value: "ALL", label: "Todos os saldos" },
  { value: "RECORDED", label: "Com saldo registrado" },
  { value: "MISSING", label: "Sem consulta de saldo" },
];

function BalanceFilters({ query, onChange }: { query: BalancePositionsQuery; onChange: (query: BalancePositionsQuery) => void }) {
  const [draft, setDraft] = useState({ searched: query.search, value: query.search });
  const input = useRef<HTMLInputElement>(null);
  const search = draft.searched === query.search ? draft.value : query.search;
  const filtered = query.search || query.status !== "ALL" || query.coverage !== "ALL";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = operationalSearch.safeParse(search);
    if (!value.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ searched: value.data, value: value.data });
    onChange({ ...query, search: value.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar posições" className="grid min-w-0 gap-3 border-y border-border px-4 py-4 sm:px-5" onSubmit={submit}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
        <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <label htmlFor="balance-search" className="text-sm font-medium">Buscar carteira</label>
          <div className="flex min-w-0 gap-2">
            <Input id="balance-search" ref={input} type="search" className="h-11 min-w-0" maxLength={120} autoComplete="off"
              placeholder="Empresa, CNPJ ou carteira" value={search}
              onChange={(event) => setDraft({ searched: query.search, value: event.target.value })} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar carteira"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="balance-status" className="text-sm font-medium">Situação Pix</span>
          <GlideSelect aria-labelledby="balance-status" size="lg" options={statuses} value={query.status}
            onChange={(value) => onChange({ ...query, status: operationalStatusFilter.parse(value), page: 1 })} />
        </div>
        <div className="grid min-w-0 gap-2">
          <span id="balance-coverage" className="text-sm font-medium">Consulta de saldo</span>
          <GlideSelect aria-labelledby="balance-coverage" size="lg" menuWidth={218} options={coverageOptions} value={query.coverage}
            onChange={(value) => onChange({ ...query, coverage: balanceCoverage.parse(value), page: 1 })} />
        </div>
      </div>
      {filtered && <Button type="button" variant="ghost" size="sm" className="-ml-2 h-11 w-fit" onClick={() => {
        input.current?.focus();
        setDraft({ searched: "", value: "" });
        onChange(initialQuery);
      }}>Limpar filtros</Button>}
    </form>
  );
}

function PositionSummary({ summary, loading }: { summary?: BalancePositionsReport["summary"]; loading: boolean }) {
  const metrics = summary && [
    {
      label: "Saldo disponível registrado",
      value: summary.balanceInCents === null ? <span aria-label="Saldo ainda sem consulta">—</span>
        : <PanelAmount cents={BigInt(summary.balanceInCents)} />,
      notes: [
        `${count.format(summary.recordedCount)} de ${count.format(summary.accountCount)} carteiras com consulta`,
        summary.oldestBalanceCheckedAt && `Consulta mais antiga em ${formatDateTime(summary.oldestBalanceCheckedAt)}`,
      ],
    },
    {
      label: "Saques em aberto",
      value: <PanelAmount cents={BigInt(summary.openWithdrawals.amountInCents)} />,
      notes: [`${count.format(summary.openWithdrawals.count)} ${summary.openWithdrawals.count === 1 ? "solicitação" : "solicitações"}`],
    },
    {
      label: "Carteiras sem consulta",
      value: count.format(summary.accountCount - summary.recordedCount),
      notes: [],
    },
  ];
  const grid = "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3";
  const cell = "min-w-0 bg-card p-4 sm:p-5 first:col-span-2 lg:first:col-span-1";

  return (
    <SkeletonReveal flow revealed={!loading} skeleton={
      <div className={grid}>{[1, 2, 3].map((key) => (
        <div key={key} className={cn(cell, "grid min-h-24 content-start gap-2.5")}>
          <Skeleton className="h-3 w-3/5 animate-none" /><Skeleton className="h-6 w-4/5 animate-none" />
          <Skeleton className="h-3 w-2/5 animate-none" />
        </div>
      ))}</div>
    }>
      {metrics && <dl aria-label="Resumo das carteiras filtradas" className={grid}>{metrics.map((metric) => (
        <div key={metric.label} className={cn(cell, "space-y-1")}>
          <dt className="text-pretty text-sm text-muted-foreground">{metric.label}</dt>
          <dd className="wrap-anywhere text-xl font-semibold tabular-nums sm:text-2xl">{metric.value}</dd>
          {metric.notes.map((note) => note && <dd key={note} className="text-pretty text-xs tabular-nums text-muted-foreground">{note}</dd>)}
        </div>
      ))}</dl>}
    </SkeletonReveal>
  );
}

function WalletIdentity({ position }: { position: BalancePosition }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium" title={position.companyName}>{position.companyName}</p>
      <p className="font-mono text-xs text-muted-foreground">Carteira final {position.walletSuffix}</p>
    </div>
  );
}

function BalanceValue({ position }: { position: BalancePosition }) {
  return position.balanceInCents === null
    ? <span className="text-sm font-normal text-muted-foreground">Sem consulta</span>
    : <PanelAmount cents={position.balanceInCents} />;
}

function WithdrawalValue({ position }: { position: BalancePosition }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="wrap-anywhere font-medium tabular-nums"><PanelAmount cents={BigInt(position.openWithdrawals.amountInCents)} /></div>
      {position.openWithdrawals.count > 0 && (
        <div className="text-xs tabular-nums text-muted-foreground">
          {count.format(position.openWithdrawals.count)} {position.openWithdrawals.count === 1 ? "saque" : "saques"}
        </div>
      )}
    </div>
  );
}

function BalanceTime({ checkedAt }: { checkedAt: string }) {
  return <time dateTime={checkedAt} className="text-xs tabular-nums text-muted-foreground">{formatDateTime(checkedAt)}</time>;
}

function OpenWallet({ position, query }: { position: BalancePosition; query: BalancePositionsQuery }) {
  const params = balancePositionsParams(query);
  params.set("from", "saldos");
  return (
    <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground">
      <Link href={`${operationalAccountsPath}/${position.id}?${params}`} prefetch={false}
        aria-label={`Ver dossiê da carteira ${position.walletSuffix} de ${position.companyName}`}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

function PositionRows({ items, query }: { items: BalancePosition[]; query: BalancePositionsQuery }) {
  return (
    <>
      <div className="hidden min-w-0 xl:block">
        <Table aria-label="Posição das carteiras" className="table-fixed">
          <colgroup>
            <col className="w-[25%]" /><col className="w-[17%]" /><col className="w-[16%]" />
            <col className="w-[19%]" /><col className="w-[17%]" /><col className="w-[6%]" />
          </colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Empresa e carteira</TableHead><TableHead scope="col" className="text-right">Saldo registrado</TableHead>
              <TableHead scope="col" className="text-right">Saques em aberto</TableHead><TableHead scope="col">Última consulta</TableHead>
              <TableHead scope="col">Situação Pix</TableHead><TableHead scope="col"><span className="sr-only">Dossiê</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((position) => (
            <TableRow key={position.id}>
              <TableCell className="py-3"><WalletIdentity position={position} /></TableCell>
              <TableCell className="wrap-anywhere py-3 text-right font-semibold tabular-nums"><BalanceValue position={position} /></TableCell>
              <TableCell className="py-3 text-right"><WithdrawalValue position={position} /></TableCell>
              <TableCell className="py-3">
                {position.balanceCheckedAt ? <BalanceTime checkedAt={position.balanceCheckedAt} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="py-3"><OperationalStatusBadge status={position.status} /></TableCell>
              <TableCell className="px-1 py-2 text-right"><OpenWallet position={position} query={query} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Posição das carteiras" className="min-w-0 divide-y divide-border xl:hidden">{items.map((position) => (
        <li key={position.id} className="grid min-w-0 gap-3 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center justify-between gap-2"><WalletIdentity position={position} /><OpenWallet position={position} query={query} /></div>
          <dl className="grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1">
              <dt className="text-xs text-muted-foreground">Saldo registrado</dt>
              <dd className="wrap-anywhere text-sm font-semibold tabular-nums"><BalanceValue position={position} /></dd>
            </div>
            <div className="min-w-0 space-y-1 text-right">
              <dt className="text-xs text-muted-foreground">Saques em aberto</dt>
              <dd className="text-sm"><WithdrawalValue position={position} /></dd>
            </div>
          </dl>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <OperationalStatusBadge status={position.status} />
            {position.balanceCheckedAt && <BalanceTime checkedAt={position.balanceCheckedAt} />}
          </div>
        </li>
      ))}</ul>
    </>
  );
}

export function AdminBalancePositionsScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const query = balancePositionsQueryFrom(useSearchParams());
  const filters = balancePositionsHref({ ...query, page: 1 });
  const filtered = query.search || query.status !== "ALL" || query.coverage !== "ALL";
  const result = useQuery({
    enabled: development,
    queryKey: [...balancePositionsQueryKey(user.id), filters, query.page],
    queryFn: ({ signal }) => fetchBalancePositions(query, signal),
    placeholderData: (previous, prior) => prior?.queryKey[1] === user.id && prior.queryKey[2] === filters ? previous : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = development ? (denied ? undefined : result.data) : undefined;

  function navigate(next: BalancePositionsQuery) {
    window.history.replaceState(null, "", balancePositionsHref(next));
  }

  return (
    <AdminPanel user={user}>
      <header className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Saldos &amp; Posições</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Consulte os saldos registrados das carteiras e acompanhe os saques em aberto.</p>
      </header>
      {(result.isLoading || data) && <PositionSummary summary={data?.summary} loading={result.isLoading} />}
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="balance-positions">
        <header className="space-y-1 px-4 py-4 sm:px-5">
          <h2 id="balance-positions" className="text-balance text-lg font-semibold">Posição por carteira</h2>
          <p className="text-pretty text-sm text-muted-foreground">O saldo reflete a última consulta de cada carteira. Para atualizar, abra o dossiê da conta.</p>
        </header>
        <BalanceFilters query={query} onChange={navigate} />
        {result.isLoading && <p role="status" className="sr-only">Carregando posições das carteiras</p>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((row) => (
            <div key={row} className="flex min-h-16 items-center gap-3 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="ml-auto h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {data?.items.length ? (
            <>
              <PositionRows items={data.items} query={{ ...query, page: data.pagination.page }} />
              <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação das carteiras"
                onPageChange={(page) => navigate({ ...query, page })} />
            </>
          ) : data ? (
            <div className="grid min-h-44 content-center justify-items-center gap-3 px-5 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">{filtered ? "Nenhuma carteira para os filtros selecionados" : "Nenhuma carteira vinculada"}</h3>
              {filtered ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => navigate(initialQuery)}>Mostrar todas as carteiras</Button>
              ) : (
                <Button asChild variant="outline" className="h-11"><Link href={operationalAccountsPath} prefetch={false}>Ver contas operacionais</Link></Button>
              )}
            </div>
          ) : !development ? <OperationalDataUnavailable /> : result.isError && (
            <div className="grid min-h-44 content-center justify-items-center gap-3 px-5 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Não foi possível consultar as posições</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
      </Card>
    </AdminPanel>
  );
}
