import type { Metadata } from "next";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveBatchHistory } from "@/features/pix-batches/components/live-batch-history";
import { batchesPath } from "@/features/pix-batches/live-batches";
import { requireBatchSession } from "@/features/pix-batches/require-batch-session";
import { loadDashboardOverview } from "@/lib/server/dashboard";
import { canActInSupport } from "@/lib/support-scope";

export const metadata: Metadata = { title: "Saques em lote" };

export default async function BatchHistoryPage() {
  const user = await requireBatchSession(batchesPath);
  const overview = canActInSupport(user.support, "payments") ? await loadDashboardOverview() : null;
  return <MerchantPanel user={user}><LiveBatchHistory merchantId={user.id} canCreate={overview?.pixWithdrawAvailable === true} /></MerchantPanel>;
}
