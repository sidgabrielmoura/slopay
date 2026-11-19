"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardPixReceive } from "@/features/pix-receive/components/dashboard-pix-receive";
import type { PixReceipt, PixReceiveGateway } from "@/features/pix-receive/pix-receipt";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { demoClock } from "@/mocks/demo-clock";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import type { Charge } from "@/types/domain";
import { OverviewScreen, type OverviewPeriod } from "./overview-screen";

function demoReceipt(charge: Charge): PixReceipt {
  const status = charge.status === "PENDING" && new Date(charge.expiresAt).getTime() <= demoClock.timestamp()
    ? "expired"
    : ({
        DRAFT: "preparing",
        PENDING: "pending",
        PAID: "paid",
        EXPIRED: "expired",
        FAILED: "failed",
      } as const)[charge.status];
  return { id: charge.id, amountInCents: charge.amountInCents, status, qrCodeAvailable: false };
}

export function DemoOverviewScreen() {
  const service = useGatewayService();
  const { activeScenario, isReadOnly } = useDemoScenario();
  const queryClient = useQueryClient();
  const pixGateway = useMemo<PixReceiveGateway>(() => ({
    async create(amountInCents) {
      return demoReceipt(await service.createCharge({ amountInCents, expirationMinutes: 60 }));
    },
    async get(id) {
      const charge = await service.getChargeById(id);
      if (!charge) throw new ApiError("Cobrança indisponível neste cenário.", 404);
      return demoReceipt(charge);
    },
    async simulate(id) {
      return demoReceipt(await service.simulatePayCharge(id));
    },
  }), [service]);
  const [period, setPeriod] = useState<OverviewPeriod>("today");
  const { data: metrics, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.overview(period),
    queryFn: () => service.getOverviewMetrics(period),
  });
  const { data: account } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
  });

  return (
    <OverviewScreen
      mode="demo"
      period={period}
      onPeriodChange={setPeriod}
      onRetry={() => { void refetch(); }}
      isLoading={isLoading}
      receiveAction={(
        <DashboardPixReceive
          key={activeScenario}
          gateway={pixGateway}
          environment="demo"
          accountId={activeScenario}
          available={!isReadOnly}
          onReceiptChange={() => {
            void queryClient.invalidateQueries({ queryKey: ["overview"] });
            void queryClient.invalidateQueries({ queryKey: queryKeys.account() });
            void queryClient.invalidateQueries({ queryKey: ["charges"] });
            void queryClient.invalidateQueries({ queryKey: ["charge"] });
            void queryClient.invalidateQueries({ queryKey: ["transactions"] });
            void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
          }}
        />
      )}
      metrics={!isError && metrics ? {
        ...metrics,
        activityCount: metrics.inflowsCount,
        activityInCents: metrics.inflowsAmountInCents,
        dailyLimitInCents: account?.dailyLimitInCents ?? 10000000,
        usedDailyLimitInCents: account?.usedDailyLimitInCents ?? 0,
        cashflowSeries: metrics.cashflowSeries.map(({ inflowsInCents, ...point }) => ({
          ...point, activityInCents: inflowsInCents,
        })),
        monthlyComparison: metrics.monthlyComparison.map(({ inflowsInCents, ...point }) => ({
          ...point, activityInCents: inflowsInCents,
        })),
        recentTransactions: metrics.recentTransactions.map((transaction) => ({
          id: transaction.id,
          description: transaction.counterpartyName,
          createdAt: transaction.createdAt,
          amountInCents: transaction.amountInCents,
          direction: transaction.direction,
          statusLabel: transaction.status === "COMPLETED"
            ? "Concluído"
            : transaction.status === "PENDING_APPROVAL" ? "Aguardando" : transaction.status,
          statusVariant: transaction.status === "COMPLETED"
            ? "success"
            : transaction.status === "PENDING_APPROVAL" ? "warning" : "secondary",
        })),
      } : null}
    />
  );
}
