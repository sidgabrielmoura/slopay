import { ChargeDetailScreen } from "@/features/pix-receive/components/charge-detail-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cobrança Pix",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChargeDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ChargeDetailScreen chargeId={id} />;
}
