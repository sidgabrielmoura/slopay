"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Pause, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { balancePositionsHref, balancePositionsQueryFrom, balancePositionsQueryKey } from "../admin-balance-positions";
import { companiesPath } from "../admin-companies";
import { adminOperationalAccounts, operationalAccountsPath, operationalParams, operationalQueryFrom, type OperationalAccountDetail } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { LinkedPixHistory } from "./admin-company-activity";
import { OperationalStatusBadge } from "./admin-operational-accounts-screen";
import { CompanyField, CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";
import { OperationalAccountAudit, OperationalAccountKeys } from "./operational-account-activity";
import { OperationalAccountStatusDialog } from "./operational-account-status-dialog";

const count = new Intl.NumberFormat("pt-BR");

export function AdminOperationalAccountScreen({ user, accountId }: { user: AdminIdentity; accountId: string }) {
  const development = useDevelopmentFeatures();
  const params = useSearchParams();
  const fromBalances = params.get("from") === "saldos";
  const listHref = fromBalances ? balancePositionsHref(balancePositionsQueryFrom(params))
    : operationalAccountsPath + operationalParams(operationalQueryFrom(params));
  const listLabel = fromBalances ? "Saldos & Posições" : "Contas operacionais";
  const result = useQuery({
    enabled: development,
    queryKey: ["admin-operational-account", user.id, accountId],
    queryFn: ({ signal }) => adminOperationalAccounts.detail(accountId, signal),
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const status = result.error instanceof ApiError ? result.error.status : null;
  const missing = status === 404;
  const data = development ? (missing || status === 401 || status === 403 ? undefined : result.data) : undefined;
  return (
    <AdminPanel user={user}>
      <Button asChild variant="ghost" className="-ml-2 h-11 w-fit px-2 text-muted-foreground">
        <Link href={listHref} prefetch={false}><ArrowLeft aria-hidden="true" />{listLabel}</Link>
      </Button>
      <ToastNotice message={result.isError && !missing ? result.error.message : null} />
      {result.isLoading && <p role="status" className="sr-only">Carregando conta operacional</p>}
      <SkeletonReveal flow revealed={!result.isLoading} skeleton={
        <div className="grid min-w-0 gap-5">
          <div className="grid gap-2"><Skeleton className="h-8 w-48 animate-none" /><Skeleton className="h-4 w-36 animate-none" /></div>
          <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((index) => <Skeleton key={index} className="h-28 animate-none rounded-xl" />)}</div>
          <CompanyRowsSkeleton />
        </div>
      }>
        {data ? <AccountDetails account={data} adminId={user.id} /> : missing ? (
          <Card className="grid min-h-48 content-center justify-items-center gap-4 p-6 text-center">
            <h1 className="text-balance text-lg font-semibold">Conta operacional não encontrada</h1>
            <Button asChild variant="outline" className="h-11"><Link href={listHref}>{listLabel}</Link></Button>
          </Card>
        ) : !development ? <OperationalDataUnavailable /> : result.isError && <CompanyReadError title="Conta indisponível" retry={() => void result.refetch()} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}

function AccountDetails({ account, adminId }: { account: OperationalAccountDetail; adminId: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const action = useRef<HTMLButtonElement>(null);
  const paused = account.pausedAt !== null;
  const context = { adminId, accountId: account.id };

  function invalidate() {
    for (const queryKey of [
      ["admin-operational-accounts", adminId], ["admin-operational-account", adminId, account.id], balancePositionsQueryKey(adminId),
      ["admin-operational-account-keys", adminId, account.id], ["admin-operational-account-audit", adminId, account.id],
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }

  const sync = useMutation({
    mutationFn: adminOperationalAccounts.refresh,
    onSuccess: ({ balanceUpdated, keysUpdated }) => {
      invalidate();
      if (balanceUpdated && keysUpdated) toast.success("Saldo e chaves Pix atualizados.");
      else toast.warning(balanceUpdated ? "Saldo atualizado. A consulta das chaves Pix falhou." : "Chaves Pix atualizadas. A consulta do saldo falhou.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 wrap-anywhere text-balance text-2xl font-semibold sm:text-3xl">{account.companyName}</h1>
            <OperationalStatusBadge status={account.status} />
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">Carteira final {account.walletSuffix}</p>
        </div>
        {account.canManage && <div className="flex flex-wrap gap-2">
          <Button type="button" className="h-11" onClick={() => sync.mutate(account.id)} disabled={sync.isPending}>
            {sync.isPending ? <LoadingIndicator /> : <RefreshCw aria-hidden="true" />}
            {sync.isPending ? "Consultando Asaas…" : "Atualizar dados do Asaas"}
          </Button>
          <Button type="button" ref={action} variant="outline" className="h-11" onClick={() => setDialogOpen(true)}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "Retomar operações Pix" : "Pausar operações Pix"}
          </Button>
        </div>}
      </header>

      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        <BalanceCard label="Saldo disponível" amount={account.balanceInCents}>
          {account.balanceCheckedAt ? <>Asaas · {formatDateTime(account.balanceCheckedAt, "medium")}</> : "Aguardando primeira consulta ao Asaas"}
        </BalanceCard>
        <BalanceCard label="Saques em aberto" amount={account.openWithdrawals.amountInCents}>
          {count.format(account.openWithdrawals.count)} {account.openWithdrawals.count === 1 ? "solicitação sem desfecho" : "solicitações sem desfecho"}
        </BalanceCard>
        <BalanceCard label="Cobrança mínima" amount={account.minimumChargeInCents}>Valor aplicado pelo Slopay por cobrança Pix</BalanceCard>
      </div>

      <Card className="min-w-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-balance text-lg font-semibold">Vínculo da carteira</h2>
            <Badge variant="secondary">Sandbox</Badge>
          </div>
          <Button asChild variant="ghost" className="-mr-2 h-11 px-2">
            <Link href={companiesPath + "/" + account.companyId} prefetch={false}>Ver empresa <ArrowUpRight aria-hidden="true" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CompanyField label="Documento"><span className="tabular-nums">{account.cnpj ? formatCNPJ(account.cnpj) : "Pessoa física"}</span></CompanyField>
            <CompanyField label="Vinculada em"><span className="tabular-nums">{formatDateTime(account.linkedAt, "date-only")}</span></CompanyField>
            <CompanyField label="Credencial verificada"><span className="tabular-nums">{formatDateTime(account.verifiedAt, "medium")}</span></CompanyField>
            <CompanyField label="Validação de saques via API">{account.withdrawalsEnabled ? "Habilitada" : "Desabilitada"}</CompanyField>
            {account.pausedAt && <CompanyField label="Operações pausadas desde"><span className="tabular-nums">{formatDateTime(account.pausedAt, "medium")}</span></CompanyField>}
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="operations" className="grid min-w-0 gap-3">
        <TabsList aria-label="Consultas da conta" className="grid h-auto w-full grid-cols-[1.45fr_1fr_1fr] gap-1 sm:w-fit">
          <TabsTrigger value="operations" className="min-h-11 min-w-0 px-2 text-xs sm:px-4 sm:text-sm">Movimentações</TabsTrigger>
          <TabsTrigger value="keys" className="min-h-11 min-w-0 px-2 text-xs sm:px-4 sm:text-sm">Chaves Pix</TabsTrigger>
          <TabsTrigger value="audit" className="min-h-11 min-w-0 px-2 text-xs sm:px-4 sm:text-sm">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="operations" className="mt-0 min-w-0">
          <LinkedPixHistory adminId={adminId} recordId={account.id} source="operational-account" load={adminOperationalAccounts.operations} />
        </TabsContent>
        <TabsContent value="keys" className="mt-0 min-w-0"><OperationalAccountKeys {...context} /></TabsContent>
        <TabsContent value="audit" className="mt-0 min-w-0"><OperationalAccountAudit {...context} /></TabsContent>
      </Tabs>
      {dialogOpen && <OperationalAccountStatusDialog account={account} onChange={invalidate}
        onClose={() => setDialogOpen(false)} restoreFocus={() => action.current?.focus()} />}
    </div>
  );
}

function BalanceCard({ label, amount, children }: { label: string; amount: number | null; children: ReactNode }) {
  return (
    <Card className="min-w-0 gap-2 p-5">
      <h2 className="text-balance text-sm font-medium text-muted-foreground">{label}</h2>
      <p className="wrap-anywhere text-2xl font-semibold tabular-nums">{amount === null ? "—" : <PanelAmount cents={amount} />}</p>
      <p className="text-pretty text-xs tabular-nums text-muted-foreground">{children}</p>
    </Card>
  );
}
