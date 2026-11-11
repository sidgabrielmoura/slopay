import { TransactionsScreen } from "@/features/transactions/components/transactions-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saídas Pix",
};

export default function SaidasPage() {
  return <TransactionsScreen initialTab="OUT" />;
}
