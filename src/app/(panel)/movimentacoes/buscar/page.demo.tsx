import { TransactionsScreen } from "@/features/transactions/components/transactions-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buscar Movimentações",
};

export default function BuscarPage() {
  return <TransactionsScreen initialTab="SEARCH" />;
}
