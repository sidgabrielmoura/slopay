import { BatchDetailScreen } from "@/features/pix-batches/components/batch-detail-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detalhe do Lote",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <BatchDetailScreen batchId={id} />;
}
