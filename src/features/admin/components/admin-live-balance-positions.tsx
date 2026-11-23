"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { formatDateTime } from "@/lib/dates";
import { liveWalletPositions } from "../admin-live-pool-accounts";
import { operationalSearch } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

function Balance({ value }: { value: string | null }) {
  return value === null ? <span className="text-muted-foreground">Sem consulta</span>
    : <PanelAmount cents={BigInt(value)} />;
}

export function AdminLiveBalancePositions({ user, operationalAccounts = false, accountId = "" }: {
  user: AdminIdentity;
  operationalAccounts?: boolean;
  accountId?: string;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(accountId);
  const result = useQuery({
    queryKey: ["admin-live-wallet-positions", user.id, search, page],
    queryFn: ({ signal }) => liveWalletPositions.list(page, search, signal),
    staleTime: 15_000, retry: retryAdminRead,
  });
  const refresh = useMutation({
    mutationFn: liveWalletPositions.refresh,
    onSuccess: () => { void result.refetch(); },
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = operationalSearch.safeParse(new FormData(event.currentTarget).get("search"));
    if (!value.success) { toast.error("Confira o texto da busca."); return; }
    setSearch(value.data);
    setPage(1);
  }

  return (
    <AdminPanel user={user}>
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">{operationalAccounts ? "Contas operacionais" : "Saldos & Posições"}</h1>
          <p className="text-pretty text-sm text-muted-foreground">{operationalAccounts ? "Consulte as carteiras que processam o Pix no Slopay."
            : "Acompanhe o saldo contabilizado, as reservas e a última consulta ao Asaas de cada carteira."}</p>
        </div>
        {operationalAccounts && <Button asChild variant="outline"><Link href="/admin/contas-bolsao">Gerenciar contas bolsão</Link></Button>}
      </header>
      <Card className="min-w-0 gap-0 py-0">
        <form role="search" aria-label="Buscar carteiras" onSubmit={submit} className="flex min-w-0 items-end gap-2 border-b p-4 sm:px-5">
          <label className="grid w-full max-w-sm min-w-0 gap-2 text-sm font-medium">
            Buscar carteira
            <Input name="search" type="search" defaultValue={accountId} maxLength={120} placeholder="Nome ou ID da carteira" />
          </label>
          <Button type="submit" size="icon" variant="outline" aria-label="Buscar carteira"><Search aria-hidden="true" /></Button>
        </form>
        <SkeletonReveal flow revealed={!result.isPending} skeleton={
          <div className="grid gap-4 p-5" aria-label="Carregando posições">
            {[0, 1, 2].map((row) => <Skeleton key={row} className="h-16 w-full animate-none" />)}
          </div>
        }>
          {result.isError ? <div className="grid justify-items-start gap-3 p-5">
            <p className="text-sm text-muted-foreground">Não foi possível consultar as posições.</p>
            <Button variant="outline" onClick={() => void result.refetch()}>Tentar novamente</Button>
          </div> : result.data && (
            <>
              <p className="px-4 pt-4 text-xs text-muted-foreground sm:px-5">
                A diferença compara a última consulta ao Asaas com o saldo contabilizado atual. Pode variar até a próxima conciliação.
              </p>
              {result.data.items.length ? (
                <ul className="divide-y" aria-label="Posições por carteira">
                  {result.data.items.map((item) => (
                    <li key={item.id} className="grid min-w-0 gap-4 p-4 sm:px-5 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,3fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <h2 className="wrap-anywhere text-sm font-semibold">{item.name}</h2>
                        <p className="text-xs text-muted-foreground">Carteira final {item.walletId.slice(-8)}</p>
                        {operationalAccounts && <Link href={"/admin/operacoes?" + new URLSearchParams({ accountId: item.id })} className="text-xs text-primary underline-offset-4 hover:underline">Ver transações da carteira</Link>}
                        {item.checkedAt && <time dateTime={item.checkedAt} className="text-xs text-muted-foreground">{formatDateTime(item.checkedAt)}</time>}
                      </div>
                      <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm xl:grid-cols-4">
                        {[["Contabilizado", item.bookedCents], ["Reservado", item.reservedCents],
                          ["Saldo Asaas", item.providerCents], ["Diferença", item.differenceCents]].map(([label, value]) => (
                          <div className="min-w-0" key={label}>
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="wrap-anywhere font-medium tabular-nums"><Balance value={value} /></dd>
                          </div>
                        ))}
                      </dl>
                      <Button type="button" variant="outline" className="justify-self-start" disabled={refresh.isPending}
                        onClick={() => refresh.mutate(item.id)}>
                        {refresh.isPending && refresh.variables === item.id ? "Consultando saldo" : "Consultar saldo"}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : <p className="p-5 text-sm text-muted-foreground">Nenhuma carteira encontrada.</p>}
              <TablePagination {...result.data.pagination} busy={result.isFetching} label="Paginação das carteiras" onPageChange={setPage} />
            </>
          )}
        </SkeletonReveal>
      </Card>
    </AdminPanel>
  );
}
