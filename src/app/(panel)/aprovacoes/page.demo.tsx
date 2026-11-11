import { ApprovalsListScreen } from "@/features/approvals/components/approvals-list-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fila de Aprovações",
};

export default function AprovacoesPage() {
  return <ApprovalsListScreen />;
}
