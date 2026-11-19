import { DemoAnalyticsScreen } from "@/features/analytics/components/demo-analytics-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indicadores Pix",
};

export default function IndicadoresPage() {
  return <DemoAnalyticsScreen />;
}
