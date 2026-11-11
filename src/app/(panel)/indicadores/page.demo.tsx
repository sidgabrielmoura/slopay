import { AnalyticsScreen } from "@/features/analytics/components/analytics-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indicadores Pix",
};

export default function IndicadoresPage() {
  return <AnalyticsScreen />;
}
