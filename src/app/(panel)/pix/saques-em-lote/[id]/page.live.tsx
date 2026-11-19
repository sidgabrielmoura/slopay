import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveBatchDetail } from "@/features/pix-batches/components/live-batch-history";
import { batchesPath } from "@/features/pix-batches/live-batches";
import { requireBatchSession } from "@/features/pix-batches/require-batch-session";
import { pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";

export const metadata: Metadata = { title: "Detalhes do lote Pix" };

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = pixPaymentIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const id = parsed.data.toLowerCase();
  const user = await requireBatchSession(batchesPath + "/" + id);
  return <MerchantPanel user={user}><LiveBatchDetail key={user.id + ":" + id} merchantId={user.id} batchId={id} /></MerchantPanel>;
}
