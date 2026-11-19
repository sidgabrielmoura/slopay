import { DemoOverviewScreen } from "@/features/overview/components/demo-overview-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Início",
};

export default function InicioPage() {
  return <DemoOverviewScreen />;
}
