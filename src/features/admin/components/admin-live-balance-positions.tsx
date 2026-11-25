"use client";

import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { KeyRound, Plus, Search, Settings2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { approvalRulesParams, approvalRulesQueryFrom, ruleStatusFilter, ruleStatusLabels, type ApprovalRulesQuery } from "../admin-approval-rules";
import { walletsHref } from "../admin-balance-positions";
import { liveWalletPositions, type LiveWalletPosition } from "../admin-live-pool-accounts";
import { operationalSearch } from "../admin-operational-accounts";
import { pixTransactionsPath } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import { adminPixFeesPath } from "../admin-pix-fees";
import { CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { LiveWalletDialog } from "./admin-live-pool-accounts";
import { LiveWalletControlsDialog } from "./live-wallet-controls-dialog";

const statuses = ruleStatusFilter.options.map(value => ({
  value, label: value === "ALL" ? "Todas as situações" : ruleStatusLabels[value].label,
}));

function Balance({ value }: { value: string | null }) {
  return value === null ? <span className="text-muted-foreground">Sem consulta</span>
    : <PanelAmount cents={BigInt(value)} />;
}

type WalletAction = { type: "register" } | { type: "configure" | "rotate"; wallet: LiveWalletPosition };

export function AdminLiveBalancePositions({ adminId }: { adminId: string }) {
  const query = approvalRulesQueryFrom(useSearchParams());
  const client = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<WalletAction | null>(null);
  const [draft, setDraft] = useState({ previous: query.search, value: query.search });
  const search = draft.previous === query.search ? draft.value : query.search;
  const filtered = Boolean(query.search || query.status !== "ALL");
  const key = ["admin-live-wallet-positions", adminId] as const;
  const filterKey = approvalRulesParams({ ...query, page: 1 }).toString();
  const result = useQuery({
    queryKey: [...key, filterKey, query.page],
    queryFn: ({ signal }) => liveWalletPositions.list(query, signal),
    placeholderData: (previous, prior) => prior?.queryKey[1] === adminId && prior.queryKey[2] === filterKey ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const data = denied ? undefined : result.data;
  const writable = !result.isError && !result.isPlaceholderData;
  const refresh = useMutation({
    mutationFn: liveWalletPositions.refresh,
    onSuccess: () => { void client.invalidateQueries({ queryKey: key }); },
    onError: error => toast.error(error.message),
  });

  function navigate(next: ApprovalRulesQuery) {
    window.history.replaceState(null, "", walletsHref("saldos", approvalRulesParams(next)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = operationalSearch.safeParse(search);
    if (!value.success) { toast.error("Confira o texto da busca."); return; }
    setDraft({ previous: value.data, value: value.data });
    navigate({ ...query, search: value.data, page: 1 });
  }

  function clear() {
    setDraft({ previous: "", value: "" });
    navigate({ status: "ALL", search: "", page: 1 });
    searchInput.current?.focus();
  }

  function open(next: WalletAction, trigger: HTMLButtonElement) {
    origin.current = trigger;
    setAction(next);
  }

  function changed() {
    void client.invalidateQueries({ queryKey: key });
    void client.invalidateQueries({ queryKey: ["admin-pool-accounts", adminId] });
  }

  const restoreFocus = () => (origin.current?.isConnected ? origin.current : heading.current)?.focus({ preventScroll: true });

  return (
    <Card className="min-w-0 gap-0 py-0" aria-labelledby="admin-wallet-positions">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <h2 id="admin-wallet-positions" ref={heading} tabIndex={-1} className="text-balance text-lg font-semibold outline-none">Saldos e configuração</h2>
          <p className="text-pretty text-sm text-muted-foreground">A diferença compara o saldo contabilizado com a última consulta ao Asaas.</p>
        </div>
        {data?.available && <Button type="button" className="min-h-11" disabled={!writable}
          onClick={event => open({ type: "register" }, event.currentTarget)}><Plus aria-hidden="true" />Cadastrar carteira</Button>}
      </header>
      <form role="search" aria-label="Filtrar carteiras" onSubmit={submit}
        className="flex min-w-0 flex-wrap items-end gap-3 border-b border-border p-4 sm:px-5">
        <div className="grid w-full min-w-0 gap-2 sm:max-w-xs">
          <label htmlFor="wallet-search" className="text-sm font-medium">Buscar carteira</label>
          <div className="flex min-w-0 gap-2">
            <Input ref={searchInput} id="wallet-search" type="search" className="h-11 min-w-0" maxLength={120}
              placeholder="Nome ou ID da carteira" value={search}
              onChange={event => setDraft({ previous: query.search, value: event.target.value })} />
            <Button type="submit" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Buscar carteira"><Search aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="grid w-full min-w-0 gap-2 sm:max-w-xs">
          <span id="wallet-approval-status" className="text-sm font-medium">Validação de saques</span>
          <GlideSelect size="lg" aria-labelledby="wallet-approval-status" options={statuses} value={query.status}
            onChange={status => navigate({ ...query, status: ruleStatusFilter.parse(status), page: 1 })} />
        </div>
        {filtered && <Button type="button" variant="ghost" className="min-h-11" onClick={clear}>Limpar filtros</Button>}
      </form>
      <ToastNotice message={result.error?.message} />
      <SkeletonReveal flow revealed={!result.isPending} skeleton={<CompanyRowsSkeleton />}>
        {data ? (
          <>
            {data.items.length ? (
              <ul className="min-w-0 divide-y divide-border" aria-label="Carteiras operacionais">
                {data.items.map(item => (
                  <li key={item.id} className="grid min-w-0 gap-4 p-4 sm:px-5 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
                    <div className="grid min-w-0 content-start gap-1.5">
                      <h3 className="text-balance wrap-anywhere text-sm font-semibold">{item.name}</h3>
                      <p className="text-xs tabular-nums text-muted-foreground">Carteira final {item.walletId.slice(-8)}</p>
                      {item.verifiedAt && <p className="text-xs text-muted-foreground">Verificada em {formatDateTime(item.verifiedAt, "date-only")}</p>}
                      {item.withdrawalStatus && <div className="flex min-w-0 flex-wrap gap-1.5">
                        <Badge variant={ruleStatusLabels[item.withdrawalStatus].variant} className="whitespace-normal">
                          {ruleStatusLabels[item.withdrawalStatus].label}
                        </Badge>
                        {item.receives && <Badge variant="secondary">Recebimentos</Badge>}
                      </div>}
                    </div>
                    <div className="grid min-w-0 gap-3">
                      <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        {[
                          ["Contabilizado", item.bookedCents], ["Reservado", item.reservedCents],
                          ["Saldo Asaas", item.providerCents], ["Diferença", item.differenceCents],
                        ].map(([label, value]) => <div key={label} className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="wrap-anywhere font-medium tabular-nums"><Balance value={value} /></dd>
                        </div>)}
                      </dl>
                      {item.checkedAt && <p className="text-xs text-muted-foreground">Consultado em <time className="tabular-nums" dateTime={item.checkedAt}>{formatDateTime(item.checkedAt)}</time></p>}
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <Button type="button" variant="outline" className="min-h-11" disabled={!writable || refresh.isPending} onClick={() => refresh.mutate(item.id)}>
                          {refresh.isPending && refresh.variables === item.id ? "Consultando saldo…" : "Consultar saldo"}
                        </Button>
                        <Button type="button" variant="outline" className="min-h-11" disabled={!writable}
                          onClick={event => open({ type: "configure", wallet: item }, event.currentTarget)}><Settings2 aria-hidden="true" />Configurar</Button>
                        {data.canRotate && <Button type="button" variant="ghost" className="min-h-11" disabled={!writable}
                          onClick={event => open({ type: "rotate", wallet: item }, event.currentTarget)}><KeyRound aria-hidden="true" />Trocar chave</Button>}
                        <Button asChild variant="ghost" className="min-h-11"><Link href={pixTransactionsPath + "?" + new URLSearchParams({ accountId: item.id })} prefetch={false}>Ver movimentações</Link></Button>
                        <Button asChild variant="ghost" className="min-h-11"><Link href={adminPixFeesPath + "/" + item.id} prefetch={false}>Ver tarifas</Link></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty icon={<Wallet aria-hidden="true" />} className="min-h-44 animate-none rounded-none border-0"
              title={filtered ? "Nenhuma carteira encontrada" : "Nenhuma carteira cadastrada"}
              description={filtered ? "Consulte com outros filtros." : data.available ? "Use Cadastrar carteira para adicionar uma conta." : "O cadastro de carteiras está indisponível neste ambiente."}
              action={filtered && <Button type="button" variant="outline" className="h-11" onClick={clear}>Limpar filtros</Button>} />}
            <TablePagination {...data.pagination} busy={result.isPlaceholderData || result.isFetching}
              label="Paginação das carteiras" onPageChange={page => navigate({ ...query, page })} />
          </>
        ) : result.isError && <CompanyReadError title="Carteiras indisponíveis" retry={() => void result.refetch()} />}
      </SkeletonReveal>
      {action?.type === "configure" && <LiveWalletControlsDialog poolId={action.wallet.id} name={action.wallet.name} adminId={adminId}
        onClose={() => setAction(null)} restoreFocus={restoreFocus} onChange={changed} />}
      {(action?.type === "register" || action?.type === "rotate") && (
        <LiveWalletDialog wallet={action.type === "rotate" ? action.wallet : null}
          onClose={() => setAction(null)} restoreFocus={restoreFocus} onCreated={changed} />
      )}
    </Card>
  );
}
