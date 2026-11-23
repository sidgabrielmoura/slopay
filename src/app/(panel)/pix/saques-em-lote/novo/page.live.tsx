import type { Metadata } from "next";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveNewBatch } from "@/features/pix-batches/components/live-new-batch";
import { batchesPath } from "@/features/pix-batches/live-batches";
import { requireBatchSession } from "@/features/pix-batches/require-batch-session";
import { loadDashboardOverview } from "@/lib/server/dashboard";

export const metadata: Metadata = { title: "Novo lote Pix" };

export default async function NewBatchPage() {
  const user = await requireBatchSession(batchesPath + "/novo");
  const overview = await loadDashboardOverview();
  return <MerchantPanel user={user}><LiveNewBatch merchantId={user.id} available={overview?.pixWithdrawAvailable === true} /></MerchantPanel>;
}
