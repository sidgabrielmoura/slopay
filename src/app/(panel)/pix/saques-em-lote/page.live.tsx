import type { Metadata } from "next";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveBatchHistory } from "@/features/pix-batches/components/live-batch-history";
import { batchesPath } from "@/features/pix-batches/live-batches";
import { requireBatchSession } from "@/features/pix-batches/require-batch-session";

export const metadata: Metadata = { title: "Saques em lote" };

export default async function BatchHistoryPage() {
  const user = await requireBatchSession(batchesPath);
  return <MerchantPanel user={user}><LiveBatchHistory merchantId={user.id} /></MerchantPanel>;
}
