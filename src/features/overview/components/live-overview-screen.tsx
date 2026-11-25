"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DashboardPixReceive } from "@/features/pix-receive/components/dashboard-pix-receive";
import { asaasPixReceive } from "@/features/pix-receive/pix-receive-gateway";
import { OwnerAccountOpeningNotice } from "@/features/account-validation/components/owner-account-opening-notice";
import { DashboardPixWithdraw } from "@/features/pix-withdraw/components/dashboard-pix-withdraw";
import { asaasPixWithdrawals, recentWithdrawalsKey, withdrawalOptionsKey } from "@/features/pix-withdraw/pix-withdrawal-gateway";
import { isWithdrawalFinal, withdrawalStatusLabel, type PixWithdrawal } from "@/features/pix-withdraw/pix-withdrawal";
import type { DashboardOverview } from "@/lib/server/dashboard";
import { operationStatus } from "./operation-summary";
import { OverviewScreen, type OverviewMetricsView, type OverviewPeriod } from "./overview-screen";

const weekdayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const operatorPixReceive = { ...asaasPixReceive, requestReconciliation: undefined, requestSimulation: undefined };

function chartLabel(date: string, formatter: Intl.DateTimeFormat) {
  const label = formatter.format(new Date(date + "T00:00:00Z")).replace(/\.$/, "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function metricsForPeriod(data: DashboardOverview, period: OverviewPeriod, readOnly: boolean): OverviewMetricsView {
  const { days, recentOperations } = data;
  const periodDays = period === "yesterday" ? days.slice(-2, -1)
    : days.slice(period === "week" ? -7 : period === "month" ? -30 : -1);
  const monthAmounts = new Map<string, { activityInCents: number; outflowsInCents?: number }>();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    const totals = monthAmounts.get(month) ?? { activityInCents: 0 };
    totals.activityInCents += day.amountInCents;
    if (day.outflowsInCents !== undefined) {
      totals.outflowsInCents = (totals.outflowsInCents ?? 0) + day.outflowsInCents;
    }
    monthAmounts.set(month, totals);
  }

  return {
    activityCount: periodDays.reduce((sum, day) => sum + day.count, 0),
    activityInCents: periodDays.reduce((sum, day) => sum + day.amountInCents, 0),
    availableBalanceInCents: data.availableBalanceInCents ?? null,
    settledBalanceInCents: data.settledBalanceInCents ?? null,
    reservedBalanceInCents: data.reservedBalanceInCents ?? null,
    outflowsCount: data.pixWithdrawAvailable || (readOnly && data.environment === "live") ? periodDays.reduce((sum, day) => sum + (day.outflowsCount ?? 0), 0) : null,
    outflowsAmountInCents: data.pixWithdrawAvailable || (readOnly && data.environment === "live") ? periodDays.reduce((sum, day) => sum + (day.outflowsInCents ?? 0), 0) : null,
    feesAmountInCents: null,
    dailyLimitInCents: null,
    usedDailyLimitInCents: null,
    pendingApprovalsCount: null,
    cashflowSeries: days.slice(-7).map((day) => ({
      date: chartLabel(day.date, weekdayLabel), activityInCents: day.amountInCents, outflowsInCents: day.outflowsInCents,
    })),
    monthlyComparison: [...monthAmounts].map(([month, totals]) => ({
      month: chartLabel(month + "-01", monthLabel), ...totals,
    })),
    recentTransactions: recentOperations.map((operation) => ({
      id: operation.reference,
      description: operation.description,
      createdAt: operation.createdAt,
      amountInCents: operation.amountInCents,
      statusLabel: operationStatus[operation.status],
      statusVariant: operation.status === "PAID" ? "success" : "secondary",
      href: readOnly ? undefined : `/movimentacoes/${encodeURIComponent(operation.reference)}`,
    })),
  };
}

export function LiveOverviewScreen({ data, merchantId, owner = true, canReceive = true, readOnly = false, canOperate = true }: {
  data: DashboardOverview | null; merchantId: string; owner?: boolean; canReceive?: boolean; readOnly?: boolean; canOperate?: boolean;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<OverviewPeriod>("today");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<{ withdrawal: PixWithdrawal } | null>(null);
  const balance = useQuery({
    queryKey: withdrawalOptionsKey(merchantId),
    queryFn: ({ signal }) => asaasPixWithdrawals.options(signal),
    enabled: !readOnly && data?.pixWithdrawAvailable === true,
    staleTime: 15_000,
    retry: false,
  });
  const recentWithdrawals = useQuery({
    queryKey: recentWithdrawalsKey(merchantId),
    queryFn: ({ signal }) => asaasPixWithdrawals.recent(signal),
    enabled: !readOnly && data?.pixWithdrawAvailable === true,
    staleTime: 10_000,
    retry: false,
  });
  const withdrawals = readOnly ? undefined : recentWithdrawals.data?.withdrawals;
  const availableBalanceInCents = data?.environment === "live"
    ? data.availableBalanceInCents ?? null : balance.isError ? null : balance.data?.availableBalanceInCents ?? null;
  const metrics = useMemo(() => {
    if (!data) return null;
    const summary = metricsForPeriod(data, period, readOnly);
    const recentOutflows: OverviewMetricsView["recentTransactions"] = (withdrawals ?? []).map((withdrawal) => ({
      id: withdrawal.id,
      amountInCents: withdrawal.amountInCents,
      createdAt: withdrawal.createdAt,
      description: withdrawal.simulated ? "Saque Pix simulado" : "Saque Pix",
      direction: "OUT",
      statusLabel: withdrawalStatusLabel(withdrawal),
      statusVariant: withdrawal.state === "DONE" ? "success"
        : withdrawal.state === "REVIEW" || withdrawal.state === "BLOCKED" ? "warning" : "secondary",
      onOpen: () => setSelectedWithdrawal({ withdrawal }),
    }));
    return {
      ...summary,
      availableBalanceInCents,
      recentTransactions: [...summary.recentTransactions, ...recentOutflows]
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt)).slice(0, 6),
    };
  }, [data, period, readOnly, availableBalanceInCents, withdrawals]);

  return (
    <OverviewScreen
      mode={data?.environment ?? "live"}
      period={period}
      onPeriodChange={setPeriod}
      onRetry={() => router.refresh()}
      metrics={metrics}
      readOnly={readOnly}
      accountNotice={owner && !readOnly ? <OwnerAccountOpeningNotice merchantId={merchantId} /> : null}
      showWithdrawalLinks={owner && !readOnly && canOperate}
      receiveAction={canReceive && !readOnly && canOperate && (
        <DashboardPixReceive
          key={`receive-${merchantId}`}
          gateway={owner ? asaasPixReceive : operatorPixReceive}
          environment={data?.environment ?? "live"}
          accountId={merchantId}
          available={data?.pixReceiveAvailable === true}
          onReceiptChange={() => {
            if (data?.pixWithdrawAvailable) void balance.refetch();
            router.refresh();
          }}
        />
      )}
      withdrawAction={owner && !readOnly && canOperate && (
        <DashboardPixWithdraw
          key={`withdraw-${merchantId}`}
          accountId={merchantId}
          available={data?.pixWithdrawAvailable === true}
          selectedWithdrawal={selectedWithdrawal}
          pendingWithdrawal={withdrawals?.find(({ state }) => !isWithdrawalFinal(state))}
          onCompleted={() => router.refresh()}
        />
      )}
    />
  );
}
