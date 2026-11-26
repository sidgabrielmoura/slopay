"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Wallet } from "lucide-react";
import { FilterInput, FilterSheet, applySearchFilters } from "@/components/shared/filter-sheet";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/dates";
import { openingsPath } from "../account-openings";
import { walletsHref, type WalletView } from "../admin-balance-positions";
import {
  poolAccounts, poolModeLabels, poolOwnerSearch, poolPage, type PoolAccount, type PoolOwner,
} from "../admin-pool-accounts";
import { retryAdminRead } from "../admin-query";
import { CompanyField, CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";
import { PoolPolicyDialog, PoolRegistrationDialog, PoolStatusDialog } from "./pool-account-dialogs";
import { livePoolControls } from "../admin-live-pool-accounts";
import { AdminLiveBalancePositions } from "./admin-live-balance-positions";
import { AdminPaymentProviders } from "./admin-payment-providers";
import { AdminBalancePositionsScreen } from "./admin-balance-positions-screen";
import { AdminOperationalAccountsScreen } from "./admin-operational-accounts-screen";
import { AdminApprovalRulesScreen } from "./admin-approval-rules-screen";
import { useAdminAccess } from "./admin-access-provider";

type Dialog = { type: "register" } | { type: "status"; account: PoolAccount } | { type: "policy"; owner: PoolOwner };
type OpenDialog = (event: MouseEvent<HTMLButtonElement>, dialog: Dialog) => void;
type OwnerFilter = { page: number; search: string };
const tableHead = "border-t border-border bg-muted/50 text-xs font-medium text-muted-foreground";

const walletViews = [
  { value: "saldos", label: "Saldos e configuração" },
  { value: "roteamento", label: "Roteamento" },
  { value: "provedores", label: "Provedores" },
] as const;
const sandboxViews = [
  { value: "bolsao", label: "Contas bolsão" },
  { value: "vinculos", label: "Vínculos" },
  { value: "validacao", label: "Validação de saques" },
] as const;

export function AdminWalletsScreen({ user, development }: { user: AdminIdentity; development: boolean }) {
  const client = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLElement>(null);
  const params = useSearchParams();
  const tabs = development ? [...walletViews, ...sandboxViews] : walletViews;
  const view = tabs.find(tab => tab.value === params.get("aba"))?.value ?? "saldos";
  const pageNumber = poolPage.catch(1).parse(params.get("page"));
  const ownerFilter: OwnerFilter = { search: poolOwnerSearch.catch("").parse(params.get("search")), page: pageNumber };

  function navigate(tab: WalletView, filters?: URLSearchParams) {
    window.history.replaceState(null, "", walletsHref(tab, filters));
  }

  function updateOwnerFilter(next: OwnerFilter) {
    const filters = new URLSearchParams();
    if (next.page > 1) filters.set("page", String(next.page));
    if (next.search) filters.set("search", next.search);
    navigate("roteamento", filters);
  }
  const [dialog, setDialog] = useState<Dialog | null>(null);

  function show(event: MouseEvent<HTMLButtonElement>, next: Dialog) {
    origin.current = event.currentTarget;
    setDialog(next);
  }

  const dialogCallbacks = {
    onClose: () => setDialog(null),
    restoreFocus: () => (origin.current?.isConnected ? origin.current : heading.current)?.focus(),
    onChange: () => { void client.invalidateQueries({ queryKey: ["admin-pool-accounts", user.id] }); },
  };

  return (
    <AdminPanel user={user}>
      <header className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold outline-none sm:text-3xl">Carteiras</h1>
          {development && <Badge variant="secondary">Sandbox</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Acompanhe saldos, habilite operações e defina o roteamento por titular.</p>
      </header>
      <Tabs value={view} activationMode="manual" onValueChange={value => {
        const tab = tabs.find(item => item.value === value);
        if (!tab || tab.value === view) return;
        const href = walletsHref(tab.value);
        if (href !== window.location.pathname + window.location.search) window.history.pushState(null, "", href);
      }} className="grid min-w-0 gap-4">
        <TabsList aria-label="Gestão de carteiras" className="flex h-auto w-fit max-w-full flex-wrap justify-start gap-1">
          {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="min-h-11 whitespace-normal text-center">{tab.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={view} className="mt-0 grid min-w-0 gap-4">
          {view === "saldos" && (development ? <AdminBalancePositionsScreen user={user} /> : <AdminLiveBalancePositions adminId={user.id} />)}
          {view === "roteamento" && <PoolOwnerList adminId={user.id} filter={ownerFilter} setFilter={updateOwnerFilter} show={show} development={development} />}
          {view === "provedores" && <AdminPaymentProviders adminId={user.id} page={pageNumber}
            onPage={page => navigate("provedores", new URLSearchParams(page > 1 ? { page: String(page) } : undefined))} />}
          {view === "bolsao" && <PoolAccountList adminId={user.id} page={pageNumber} show={show} development={development}
            setPage={page => navigate("bolsao", new URLSearchParams(page > 1 ? { page: String(page) } : undefined))} />}
          {view === "vinculos" && <AdminOperationalAccountsScreen user={user} />}
          {view === "validacao" && <AdminApprovalRulesScreen user={user} />}
        </TabsContent>
      </Tabs>
      {dialog?.type === "register" && <PoolRegistrationDialog {...dialogCallbacks} />}
      {dialog?.type === "status" && <PoolStatusDialog account={dialog.account} {...dialogCallbacks} />}
      {dialog?.type === "policy" && <PoolPolicyDialog owner={dialog.owner} adminId={user.id} development={development} {...dialogCallbacks} />}
    </AdminPanel>
  );
}

function PoolAccountList({ adminId, page, setPage, show, development }: {
  adminId: string; page: number; setPage: (page: number) => void; show: OpenDialog; development: boolean;
}) {
  const { can } = useAdminAccess();
  const result = useQuery({
    queryKey: ["admin-pool-accounts", adminId, "accounts", page],
    queryFn: ({ signal }) => poolAccounts.list(page, signal),
    placeholderData: (previous, prior) => prior?.queryKey[1] === adminId ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const data = result.data;
  const writable = development && data?.available === true && !result.isError && !result.isPlaceholderData;
  const canRegister = writable && can("admin.wallets.register");
  const canConfigure = can("admin.wallets.configure");

  function registration(event: MouseEvent<HTMLButtonElement>) {
    show(event, { type: "register" });
  }

  return (
    <SkeletonReveal flow revealed={!result.isPending} skeleton={<CompanyRowsSkeleton />}>
      {data ? (
        <Card className="min-w-0 gap-0 overflow-hidden">
          <CardHeader className="items-start justify-between gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0">
              <h2 className="text-balance text-lg font-semibold">Contas operacionais</h2>
              <p className="mt-1 text-pretty text-sm text-muted-foreground">
                {development
                  ? "Recebimentos Pix em ambiente de desenvolvimento. Saques e operações reais estão indisponíveis."
                  : "Acompanhe as contas que integram o roteamento do Slopay."}
              </p>
            </div>
            {canRegister && data.items.length > 0 && <Button type="button" className="h-11" onClick={registration}><Plus aria-hidden="true" />Cadastrar conta</Button>}
          </CardHeader>
          {result.isError && <p role="alert" className="px-5 pb-3 text-sm text-destructive">{result.error.message}</p>}
          {!data.available ? <PoolUnavailable /> : <>
            <div aria-busy={result.isPlaceholderData}>
              {data.items.length > 0 ? <AccountRows items={data.items} writable={writable} canConfigure={canConfigure} show={show} /> : (
                <Empty title="Nenhuma conta bolsão cadastrada" description="Cadastre a primeira carteira do Slopay para habilitar o roteamento."
                  className="min-h-52 animate-none rounded-none border-0 border-t"
                  icon={<Wallet aria-hidden="true" />}
                  action={canRegister && <Button type="button" className="h-11" onClick={registration}><Plus aria-hidden="true" />Cadastrar conta</Button>} />
              )}
            </div>
            <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação das contas bolsão" onPageChange={setPage} />
          </>}
        </Card>
      ) : result.isError && <CompanyReadError title="Contas bolsão indisponíveis" retry={() => void result.refetch()} />}
    </SkeletonReveal>
  );
}

function AccountRows({ items, writable, canConfigure, show }: {
  items: PoolAccount[]; writable: boolean; canConfigure: boolean; show: OpenDialog;
}) {
  const rowAction = (entry: PoolAccount) => <Button type="button" variant="outline" className="h-11"
    disabled={!writable} aria-label={`${entry.active ? "Pausar" : "Reativar"} ${entry.name}`}
    onClick={(event) => show(event, { type: "status", account: entry })}>
    {entry.active ? "Pausar" : "Reativar"}
  </Button>;
  const status = (entry: PoolAccount) => <Badge variant={entry.active ? "success" : "warning"}>{entry.active ? "Ativa" : "Pausada"}</Badge>;
  const identity = (entry: PoolAccount) => <div className="grid min-w-0 gap-1">
    <span className="wrap-anywhere font-medium">{entry.name}</span>
    <span className="text-xs tabular-nums text-muted-foreground">Carteira final {entry.walletId.slice(-8)}</span>
  </div>;
  return (
    <>
      <table className="hidden w-full table-fixed text-left text-sm lg:table">
        <caption className="sr-only">Contas bolsão cadastradas</caption>
        <thead className={tableHead}>
          <tr>
            <th scope="col" className="w-[26%] px-5 py-3">Conta</th>
            <th scope="col" className="w-[33%] px-3 py-3">Caminho do webhook</th>
            <th scope="col" className="w-[14%] px-3 py-3">Verificada em</th>
            <th scope="col" className="w-[12%] px-3 py-3">Situação</th>
            {canConfigure && <th scope="col" className="px-5 py-3 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((entry) => <tr key={entry.id} className="hover:bg-muted/30">
            <td className="px-5 py-3">{identity(entry)}</td>
            <td className="px-3 py-3"><code className="wrap-anywhere text-xs text-muted-foreground">{entry.webhookPath}</code></td>
            <td className="px-3 py-3 tabular-nums text-muted-foreground">{formatDateTime(entry.verifiedAt, "date-only")}</td>
            <td className="px-3 py-3">{status(entry)}</td>
            {canConfigure && <td className="px-5 py-3 text-right">{rowAction(entry)}</td>}
          </tr>)}
        </tbody>
      </table>
      <ul aria-label="Contas bolsão cadastradas" className="divide-y divide-border border-t border-border lg:hidden">
        {items.map((entry) => <li key={entry.id} className="grid min-w-0 gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">{identity(entry)}{status(entry)}</div>
          <dl>
            <CompanyField label="Caminho do webhook"><code className="wrap-anywhere text-xs">{entry.webhookPath}</code></CompanyField>
          </dl>
          {canConfigure && <div className="justify-self-start">{rowAction(entry)}</div>}
        </li>)}
      </ul>
    </>
  );
}

function PoolOwnerList({ adminId, filter, setFilter, show, development }: {
  adminId: string; filter: OwnerFilter; setFilter: (filter: OwnerFilter) => void; show: OpenDialog; development: boolean;
}) {
  const { can } = useAdminAccess();
  const result = useQuery({
    queryKey: ["admin-pool-accounts", adminId, "owners", development, filter.search, filter.page],
    queryFn: ({ signal }) => (development ? poolAccounts : livePoolControls).owners(filter.page, filter.search, signal),
    placeholderData: (previous, prior) => prior?.queryKey[1] === adminId && prior.queryKey[4] === filter.search ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const data = result.data;
  const writable = data?.available === true && !result.isError && !result.isPlaceholderData;

  const defaults = { search: "", page: 1 };
  const clearSearch = () => setFilter(defaults);

  return (
    <SkeletonReveal flow revealed={!result.isPending} skeleton={<CompanyRowsSkeleton />}>
      {data ? (
        <Card className="min-w-0 gap-0 overflow-hidden">
          <CardHeader className="min-w-0 flex-wrap items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-balance text-lg font-semibold">Roteamento por titular</h2>
              <p className="mt-1 text-pretty text-sm text-muted-foreground">
                Por padrão, um sorteio escolhe entre todas as contas elegíveis para cada nova operação.
              </p>
            </div>
            {data.available && <FilterSheet value={filter} defaults={defaults} active={Boolean(filter.search)}
              onApply={draft => applySearchFilters(draft, poolOwnerSearch, setFilter)}>
              {(draft, setDraft) => <FilterInput label="Titular" placeholder="Nome ou e-mail" maxLength={120} value={draft.search}
                onChange={event => setDraft({ ...draft, search: event.target.value })} />}
            </FilterSheet>}
          </CardHeader>
          {result.isError && <p role="alert" className="px-5 pb-3 text-sm text-destructive">{result.error.message}</p>}
          {!data.available ? <PoolUnavailable /> : <>
            <div aria-busy={result.isPlaceholderData}>
              {data.items.length > 0 ? <OwnerRows items={data.items} writable={writable} canRoute={can("admin.wallets.route")} show={show} /> : <Empty
                title={filter.search ? "Nenhum titular encontrado" : "Nenhum titular elegível"}
                description={filter.search ? "Busque pelo nome ou pelo e-mail cadastrado." : "Titulares aprovados aparecem aqui."}
                className="min-h-52 animate-none rounded-none border-0 border-t"
                action={filter.search ? <Button type="button" variant="outline" className="h-11" onClick={clearSearch}>Limpar busca</Button>
                  : <Button asChild variant="outline" className="h-11"><Link href={openingsPath}>Ver abertura de contas</Link></Button>} />}
            </div>
            <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação dos titulares"
              onPageChange={(page) => setFilter({ ...filter, page })} />
          </>}
        </Card>
      ) : result.isError && <CompanyReadError title="Roteamento indisponível" retry={() => void result.refetch()} />}
    </SkeletonReveal>
  );
}

function OwnerRows({ items, writable, canRoute, show }: {
  items: PoolOwner[]; writable: boolean; canRoute: boolean; show: OpenDialog;
}) {
  const policy = (owner: PoolOwner): ReactNode => (
    <div className="grid min-w-0 gap-1">
      <Badge variant="secondary" className="w-fit">{poolModeLabels[owner.mode]}</Badge>
      <span className="text-xs tabular-nums text-muted-foreground">
        {owner.mode === "RANDOM" ? "Todas as contas elegíveis" :
          `${owner.accountIds.length} ${owner.accountIds.length === 1 ? "conta selecionada" : "contas selecionadas"}`}
      </span>
    </div>
  );
  const identity = (owner: PoolOwner) => (
    <div className="grid min-w-0 gap-1">
      <span className="wrap-anywhere font-medium">{owner.name}</span>
      <span className="wrap-anywhere text-xs text-muted-foreground">{owner.email}</span>
    </div>
  );
  const action = (owner: PoolOwner) => <Button type="button" variant="outline" className="h-11"
    aria-label={`Alterar roteamento de ${owner.name}`} disabled={!writable}
    onClick={(event) => show(event, { type: "policy", owner })}>Alterar regra</Button>;
  return (
    <>
      <table className="hidden w-full table-fixed text-left text-sm md:table">
        <caption className="sr-only">Regras de roteamento dos titulares</caption>
        <thead className={tableHead}>
          <tr>
            <th scope="col" className="w-[44%] px-5 py-3">Titular</th>
            <th scope="col" className="w-[34%] px-3 py-3">Regra</th>
            {canRoute && <th scope="col" className="px-5 py-3 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((owner) => <tr key={owner.id} className="hover:bg-muted/30">
            <td className="px-5 py-3">{identity(owner)}</td>
            <td className="px-3 py-3">{policy(owner)}</td>
            {canRoute && <td className="px-5 py-3 text-right">{action(owner)}</td>}
          </tr>)}
        </tbody>
      </table>
      <ul aria-label="Regras de roteamento dos titulares" className="divide-y divide-border border-t border-border md:hidden">
        {items.map((owner) => <li key={owner.id} className="grid min-w-0 gap-3 p-4 sm:p-5">
          {identity(owner)}{policy(owner)}{canRoute && <div className="justify-self-start">{action(owner)}</div>}
        </li>)}
      </ul>
    </>
  );
}

function PoolUnavailable() {
  return <OperationalDataUnavailable title="Contas bolsão indisponíveis" description="O roteamento de operações ainda não está habilitado neste ambiente." />;
}
