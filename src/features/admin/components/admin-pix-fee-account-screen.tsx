"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { PixFeeCards } from "@/features/account/components/pix-fee-cards";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { operationalAccountsPath } from "../admin-operational-accounts";
import { adminPixFeeDetailKey, adminPixFees, adminPixFeesListKey, adminPixFeesPath, pixFeesParams, pixFeesQueryFrom } from "../admin-pix-fees";
import { retryAdminRead } from "../admin-query";
import { OperationalStatusBadge } from "./admin-operational-accounts-screen";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

export function AdminPixFeeAccountScreen({ user, accountId }: { user: AdminIdentity; accountId: string }) {
  const development = useDevelopmentFeatures();
  const back = adminPixFeesPath + pixFeesParams(pixFeesQueryFrom(useSearchParams()));
  const client = useQueryClient();
  const key = adminPixFeeDetailKey(user.id, accountId);
  const result = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => adminPixFees.detail(accountId, signal),
    staleTime: 15_000, retry: retryAdminRead,
  });
  const refresh = useMutation({
    mutationFn: () => adminPixFees.refresh(accountId),
    onMutate: () => client.cancelQueries({ queryKey: key }),
    onSuccess: (wallet) => {
      client.setQueryData(key, wallet);
      void client.invalidateQueries({ queryKey: adminPixFeesListKey(user.id) });
    },
  });
  const denied = result.error instanceof ApiError && [401, 403, 404].includes(result.error.status);
  const wallet = denied ? undefined : result.data;

  return (
    <AdminPanel user={user}>
      <div className="grid min-w-0 gap-5">
        <Button asChild variant="ghost" className="-ml-2 h-11 w-fit">
          <Link href={back} prefetch={false}><ArrowLeft aria-hidden="true" /> Taxas e limites</Link>
        </Button>
        <ToastNotice message={refresh.error?.message ?? result.error?.message} />
        {result.isLoading && <span role="status" className="sr-only">Carregando tarifas da carteira</span>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="grid min-w-0 gap-5">
            <div className="grid gap-3"><Skeleton className="h-7 w-56 max-w-full animate-none" /><Skeleton className="h-4 w-40 animate-none" /></div>
            <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-44 animate-none" /><Skeleton className="h-44 animate-none" /></div>
          </div>
        }>
          {wallet ? (
            <div className="grid min-w-0 gap-5">
              <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="text-balance wrap-anywhere text-2xl font-semibold sm:text-3xl">{wallet.companyName}</h1>
                    {development && <Badge variant="secondary">Sandbox</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground tabular-nums">{wallet.cnpj ? formatCNPJ(wallet.cnpj) + " · " : ""}Carteira final {wallet.walletSuffix}</p>
                </div>
                <Button type="button" className="h-11" disabled={!wallet.canRefresh || refresh.isPending}
                  aria-busy={refresh.isPending} onClick={() => refresh.mutate()}>
                  {refresh.isPending ? <LoadingIndicator /> : <RotateCw aria-hidden="true" />}
                  {refresh.isPending ? "Consultando tarifas…" : wallet.checkedAt ? "Atualizar tarifas" : "Consultar tarifas"}
                </Button>
              </header>
              <Card className="grid min-w-0 gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-balance font-semibold">Consulta de tarifas</h2>
                    <p className="text-pretty text-sm text-muted-foreground">
                      {wallet.checkedAt ? <>Registrada em <time dateTime={wallet.checkedAt} className="tabular-nums">{formatDateTime(wallet.checkedAt)}</time></>
                        : "Esta carteira ainda aguarda a primeira consulta."}
                    </p>
                    {!wallet.canRefresh && <p className="text-pretty text-sm text-muted-foreground">A consulta de tarifas está indisponível nesta carteira.</p>}
                  </div>
                  {refresh.isSuccess && (
                    <div role="status" className="flex items-center gap-2 text-sm font-medium">
                      <LoadingConfirmation key={refresh.submittedAt} size={32} animate /> Tarifas atualizadas
                    </div>
                  )}
                </div>
                {refresh.isError && <OperationFailure key={refresh.submittedAt} message={wallet.checkedAt
                  ? "A atualização falhou. As tarifas da última consulta continuam disponíveis."
                  : refresh.error.message} />}
              </Card>
              {wallet.fees && <PixFeeCards data={wallet.fees} />}
              <Card className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-balance font-semibold">Conta operacional</h2>
                    <OperationalStatusBadge status={wallet.status} />
                  </div>
                  <p className="text-pretty text-sm text-muted-foreground">{wallet.withdrawalsConfigured
                    ? "A aprovação do titular está configurada para saques via API."
                    : "A carteira aguarda configuração da aprovação de saques via API."}</p>
                </div>
                <Button asChild variant="outline" className="h-11">
                  <Link href={operationalAccountsPath + "/" + wallet.id} prefetch={false}>Ver conta <ArrowUpRight aria-hidden="true" /></Link>
                </Button>
              </Card>
            </div>
          ) : result.isError && (
            <Card className="grid min-h-36 content-center justify-items-start gap-3 p-5">
              <h1 className="text-balance text-xl font-semibold">
                {result.error instanceof ApiError && result.error.status === 404 ? "Conta operacional não encontrada" : "Consulta de tarifas indisponível"}
              </h1>
              {!(result.error instanceof ApiError && result.error.status === 404) && (
                <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
              )}
            </Card>
          )}
        </SkeletonReveal>
      </div>
    </AdminPanel>
  );
}
