"use client";

import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import { AnalyticsScreen } from "./analytics-screen";

export function DemoAnalyticsScreen() {
  const service = useGatewayService();
  const { activeScenario } = useDemoScenario();
  return <AnalyticsScreen scope={"demo:" + activeScenario} load={(period) => service.getAnalytics(period)} />;
}
