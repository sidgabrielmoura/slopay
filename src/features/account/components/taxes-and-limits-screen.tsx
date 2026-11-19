"use client";

import { useQuery } from "@tanstack/react-query";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToastNotice } from "@/components/ui/toast-notice";
import { demoPolicy } from "@/config/demo-policy.config";
import { queryKeys } from "@/lib/query-keys";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import type { Account } from "@/types/domain";
import { PixConditionsLayout, PixFeeCard, PixTermsList, PixTermsLoading, StatementFeesLink } from "./pix-conditions-layout";

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export function TaxesAndLimitsScreen() {
  const service = useGatewayService();
  const account = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
    retry: false,
  });

  return (
    <>
      <ToastNotice message={account.isError ? "Não foi possível atualizar os limites da demonstração." : null} />
      <PixConditionsLayout source="Demonstração" refresh={{ busy: account.isFetching, run: () => void account.refetch() }}
        fees={(
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <PixFeeCard direction="receive" terms={[
                ["Percentual por recebimento", percent.format(demoPolicy.receiveFeePercentage)],
                ["Tarifa mínima", <PanelAmount cents={demoPolicy.receiveFeeMinInCents} />],
              ]} />
              <PixFeeCard direction="withdraw" terms={[
                ["Percentual por transferência", percent.format(demoPolicy.withdrawFeePercentage)],
                ["Tarifa mínima", <PanelAmount cents={demoPolicy.withdrawFeeMinInCents} />],
              ]} />
            </div>
            <StatementFeesLink />
          </>
        )}
        limits={account.data ? <DemoLimits account={account.data} /> : account.isPending ? <PixTermsLoading /> : (
          <Card className="p-5"><h2 className="text-base font-semibold">Limites indisponíveis</h2></Card>
        )}
      />
    </>
  );
}

function DemoLimits({ account }: { account: Account }) {
  const { hideValues, preferencesReady } = usePreferences();
  const { dailyLimitInCents: daily, usedDailyLimitInCents: used } = account;
  const available = Math.max(0, daily - used);
  const usedPercent = daily > 0 ? Math.min(100, (used / daily) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="p-5 pb-3"><h2 className="text-balance text-lg font-semibold">Limite diário</h2></CardHeader>
        <CardContent className="grid gap-3 px-5 pb-4">
          {preferencesReady && !hideValues && daily > 0 && (
            <Progress value={usedPercent} indicatorClassName="transition-none" aria-label="Consumo do limite diário" />
          )}
          <PixTermsList terms={[
            ["Limite diário", <PanelAmount cents={daily} />],
            ["Utilizado", <PanelAmount cents={used} />],
            ["Restante", <PanelAmount cents={available} />],
          ]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="p-5 pb-3"><h2 className="text-balance text-lg font-semibold">Limites por operação</h2></CardHeader>
        <CardContent className="px-5 pb-4">
          <PixTermsList terms={[
            ["Máximo por saque direto", <PanelAmount cents={account.maxPerTransactionInCents ?? demoPolicy.maxTransactionAmountInCents} />],
            ["Valor mínimo do lote", <PanelAmount cents={demoPolicy.batchMinAmountInCents} />],
          ]} />
        </CardContent>
      </Card>
    </div>
  );
}
