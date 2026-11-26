"use client";

import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowDownUp, Ellipsis, KeyRound, LockKeyhole, Percent, Plus, RefreshCw, Search, Settings2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { AdminWalletCloseDialog } from "./admin-wallet-close-dialog";
import { useAdminAccess } from "./admin-access-provider";

const statuses = ruleStatusFilter.options.map(value => ({
  value, label: value === "ALL" ? "Todas as situações" : ruleStatusLabels[value].label,
}));

const balanceColumns = [
  { key: "bookedCents", label: "Saldo dos clientes" },
  { key: "reservedCents", label: "Reservado" },
  { key: "platformRevenueCents", label: "Tarifas Slopay" },
  { key: "providerCents", label: "Saldo do provedor" },
  { key: "differenceCents", label: "Diferença" },
] as const;

function Balance({ value }: { value: string | null }) {
  return value === null ? <span className="text-muted-foreground">Sem consulta</span>
    : <PanelAmount cents={BigInt(value)} />;
}

type WalletChange = { type: "configure" | "rotate" | "close"; wallet: LiveWalletPosition };
type WalletAction = { type: "register" } | WalletChange;

function WalletPositionRow({ item, writable, canRotate, refreshingId, refreshBalance, openAction }: {
  item: LiveWalletPosition;
  writable: boolean;
  canRotate: boolean;
  refreshingId?: string;
  refreshBalance: (id: string) => void;
  openAction: (action: WalletChange, trigger: HTMLButtonElement) => void;
}) {
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const { can } = useAdminAccess();
  const canRefresh = !item.closedAt && can("admin.wallets.refresh");
  const canConfigure = !item.closedAt && can("admin.wallets.configure");
  const canRotateKey = !item.closedAt && canRotate && can("admin.wallets.rotate");
  const canClose = !item.closedAt && can("admin.wallets.close");
  const nextDialog = useRef<WalletChange["type"] | null>(null);
  const withdrawalStatus = item.withdrawalStatus && ruleStatusLabels[item.withdrawalStatus];

  return (
    <TableRow>
      <th scope="row" className="px-4 py-3 text-left font-semibold">{item.name}</th>
      <TableCell className="py-3 font-mono text-xs text-muted-foreground">{item.walletId.slice(-8)}</TableCell>
      <TableCell className="py-3 text-muted-foreground">
        {item.verifiedAt ? <time dateTime={item.verifiedAt}>{formatDateTime(item.verifiedAt, "date-only")}</time> : "—"}
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-1.5">
          {item.closedAt ? <Badge variant="secondary">Encerrada</Badge> : <>
            {withdrawalStatus && <Badge variant={withdrawalStatus.variant}>{withdrawalStatus.label}</Badge>}
            {item.receives && <Badge variant="secondary">Recebimentos</Badge>}
            {!withdrawalStatus && !item.receives && <span className="text-muted-foreground">—</span>}
          </>}
        </div>
      </TableCell>
      {balanceColumns.map(({ key }) => (
        <TableCell key={key} className="py-3 text-right font-medium"><Balance value={item[key]} /></TableCell>
      ))}
      <TableCell className="py-3 text-muted-foreground">
        <span role="status">
          {refreshingId === item.id ? "Consultando saldo…" : item.checkedAt
            ? <time dateTime={item.checkedAt}>{formatDateTime(item.checkedAt)}</time> : "—"}
        </span>
      </TableCell>
      <TableCell className="sticky right-0 z-10 bg-card px-2 py-2 text-right">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button ref={menuTrigger} type="button" variant="ghost" size="icon"
              className="size-11 text-muted-foreground data-[state=open]:bg-accent"
              aria-label={`Ações da carteira ${item.name}`}>
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" collisionPadding={12}
            className="max-h-(--radix-dropdown-menu-content-available-height) w-56 max-w-(--radix-dropdown-menu-content-available-width) overflow-y-auto overscroll-contain"
            onCloseAutoFocus={event => {
              const type = nextDialog.current;
              nextDialog.current = null;
              if (!type || !menuTrigger.current) return;
              event.preventDefault();
              openAction({ type, wallet: item }, menuTrigger.current);
            }}>
            {(canRefresh || canConfigure || canRotateKey || canClose) && <>
              <DropdownMenuGroup>
                {canRefresh && <DropdownMenuItem className="min-h-11" disabled={!writable || refreshingId !== undefined}
                  onSelect={() => refreshBalance(item.id)}>
                  <RefreshCw aria-hidden="true" />Consultar saldo
                </DropdownMenuItem>}
                {canConfigure && <DropdownMenuItem className="min-h-11" disabled={!writable}
                  onSelect={() => { nextDialog.current = "configure"; }}>
                  <Settings2 aria-hidden="true" />Configurar
                </DropdownMenuItem>}
                {canRotateKey && <DropdownMenuItem className="min-h-11" disabled={!writable}
                  onSelect={() => { nextDialog.current = "rotate"; }}>
                  <KeyRound aria-hidden="true" />Trocar chave
                </DropdownMenuItem>}
                {canClose && <DropdownMenuItem className="min-h-11 text-destructive" disabled={!writable}
                  onSelect={() => { nextDialog.current = "close"; }}>
                  <LockKeyhole aria-hidden="true" />Encerrar carteira
                </DropdownMenuItem>}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>}
            <DropdownMenuGroup>
              {can("admin.movements.read") && <DropdownMenuItem asChild className="min-h-11">
                <Link href={pixTransactionsPath + "?" + new URLSearchParams({ accountId: item.id })} prefetch={false}>
                  <ArrowDownUp aria-hidden="true" />Ver movimentações
                </Link>
              </DropdownMenuItem>}
              {can("admin.fees.read") && <DropdownMenuItem asChild className="min-h-11">
                <Link href={adminPixFeesPath + "/" + item.id} prefetch={false}>
                  <Percent aria-hidden="true" />Ver tarifas
                </Link>
              </DropdownMenuItem>}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function AdminLiveBalancePositions({ adminId }: { adminId: string }) {
  const { can } = useAdminAccess();
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
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
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
          <p className="text-pretty text-sm text-muted-foreground">A diferença compara o saldo no provedor com a soma dos saldos dos clientes e das tarifas Slopay.</p>
        </div>
        {data?.available && can("admin.wallets.register") && <Button type="button" className="min-h-11" disabled={!writable}
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
              <Table className="w-max min-w-full whitespace-nowrap tabular-nums" aria-label="Carteiras operacionais"
                scrollLabel="Rolagem horizontal dos saldos das carteiras">
                <TableHeader className="bg-secondary/20">
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">Carteira</TableHead>
                    <TableHead scope="col">Final da carteira</TableHead>
                    <TableHead scope="col">Verificada em</TableHead>
                    <TableHead scope="col">Situação</TableHead>
                    {balanceColumns.map(({ key, label }) => <TableHead key={key} scope="col" className="text-right">{label}</TableHead>)}
                    <TableHead scope="col">Última consulta</TableHead>
                    <TableHead scope="col" className="sticky right-0 z-10 bg-card"><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map(item => (
                    <WalletPositionRow key={item.id} item={item} writable={writable} canRotate={data.canRotate}
                      refreshingId={refresh.isPending ? refresh.variables : undefined}
                      refreshBalance={refresh.mutate} openAction={open} />
                  ))}
                </TableBody>
              </Table>
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
      {action?.type === "close" && <AdminWalletCloseDialog wallet={action.wallet}
        onClose={() => setAction(null)} restoreFocus={restoreFocus} onSuccess={changed} />}
      {(action?.type === "register" || action?.type === "rotate") && (
        <LiveWalletDialog wallet={action.type === "rotate" ? action.wallet : null}
          onClose={() => setAction(null)} restoreFocus={restoreFocus} onCreated={changed} />
      )}
    </Card>
  );
}
