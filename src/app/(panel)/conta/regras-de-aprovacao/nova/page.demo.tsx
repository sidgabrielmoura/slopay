import { RuleFormScreen } from "@/features/approval-rules/components/rule-form-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nova regra de aprovação",
};

export default function NovaRegraPage() {
  return <RuleFormScreen />;
}
