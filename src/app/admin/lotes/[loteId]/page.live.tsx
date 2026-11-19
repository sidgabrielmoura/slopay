import { notFound } from "next/navigation";
import { adminBatchId } from "@/features/admin/admin-withdrawal-batches";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminWithdrawalBatchScreen } from "@/features/admin/components/admin-withdrawal-batch-detail";
import { requireSession } from "@/lib/server/session";

export default async function AdminBatchPage({ params }: { params: Promise<{ loteId: string }> }) {
  const batchId = adminBatchId.safeParse((await params).loteId);
  if (!batchId.success) notFound();
  const { id, fullName, email } = await requireSession(`/admin/lotes/${batchId.data}`, { admin: true });
  return <AdminActivityProvider accountId={id}><AdminWithdrawalBatchScreen user={{ id, fullName, email }} batchId={batchId.data} /></AdminActivityProvider>;
}
