import { RuleFormScreen } from "@/features/approval-rules/components/rule-form-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editar Regra de Aprovação",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarRegraPage({ params }: PageProps) {
  const { id } = await params;
  return <RuleFormScreen ruleId={id} />;
}
