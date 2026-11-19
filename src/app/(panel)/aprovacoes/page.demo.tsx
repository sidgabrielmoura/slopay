import { ApprovalsListScreen } from "@/features/approvals/components/approvals-list-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aprovações",
};

export default function AprovacoesPage() {
  return <ApprovalsListScreen />;
}
