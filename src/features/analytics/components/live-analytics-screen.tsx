"use client";

import { requestPixGateway } from "@/lib/pix-gateway-client";
import { indicatorReportSchema, indicatorsUnavailable, type IndicatorPeriod } from "../indicators";
import { AnalyticsScreen } from "./analytics-screen";

function loadIndicators(period: IndicatorPeriod, signal: AbortSignal) {
  const search = new URLSearchParams({ period });
  return requestPixGateway("/api/dashboard/indicators?" + search, indicatorReportSchema, indicatorsUnavailable, { signal });
}

export function LiveAnalyticsScreen({ merchantId }: { merchantId: string }) {
  return <AnalyticsScreen scope={"merchant:" + merchantId} load={loadIndicators} />;
}
