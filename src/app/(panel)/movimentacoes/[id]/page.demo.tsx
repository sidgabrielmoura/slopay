import { TransactionDetailScreen } from "@/features/transactions/components/transaction-detail-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detalhe da Transação",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <TransactionDetailScreen transactionId={id} />;
}
