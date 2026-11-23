import type { Metadata } from "next";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveBatchHistory } from "@/features/pix-batches/components/live-batch-history";
import { batchesPath } from "@/features/pix-batches/live-batches";
import { requireBatchSession } from "@/features/pix-batches/require-batch-session";
import { loadDashboardOverview } from "@/lib/server/dashboard";

export const metadata: Metadata = { title: "Saques em lote" };

export default async function BatchHistoryPage() {
  const user = await requireBatchSession(batchesPath);
  const overview = await loadDashboardOverview();
  return <MerchantPanel user={user}><LiveBatchHistory merchantId={user.id} canCreate={overview?.pixWithdrawAvailable === true} /></MerchantPanel>;
}
