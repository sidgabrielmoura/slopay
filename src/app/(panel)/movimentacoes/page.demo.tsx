import { TransactionsScreen } from "@/features/transactions/components/transactions-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Movimentações & Extrato",
};

export default function MovimentacoesPage() {
  return <TransactionsScreen initialTab="ALL" />;
}
