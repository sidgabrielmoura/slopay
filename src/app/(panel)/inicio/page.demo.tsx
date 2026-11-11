import { OverviewScreen } from "@/features/overview/components/overview-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Início",
};

export default function InicioPage() {
  return <OverviewScreen />;
}
