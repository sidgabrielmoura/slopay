import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminWithdrawalBatchesScreen } from "@/features/admin/components/admin-withdrawal-batches-screen";
import { requireSession } from "@/lib/server/session";

export default async function AdminBatchesPage() {
  const { id, fullName, email } = await requireSession("/admin/lotes", { admin: true });
  return <AdminActivityProvider accountId={id}><AdminWithdrawalBatchesScreen user={{ id, fullName, email }} /></AdminActivityProvider>;
}
