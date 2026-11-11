import { TransactionsScreen } from "@/features/transactions/components/transactions-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recebimentos Pix",
};

export default function RecebimentosPage() {
  return <TransactionsScreen initialTab="IN" />;
}
