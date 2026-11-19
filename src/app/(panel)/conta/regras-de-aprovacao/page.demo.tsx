import { RulesListScreen } from "@/features/approval-rules/components/rules-list-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regras de aprovação",
};

export default function RegrasAprovacaoPage() {
  return <RulesListScreen />;
}
