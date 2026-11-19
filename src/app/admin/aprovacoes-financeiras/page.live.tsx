import type { Metadata } from "next";
import { adminApprovalsPath } from "@/features/admin/admin-withdrawal-approvals";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminWithdrawalApprovalsScreen } from "@/features/admin/components/admin-withdrawal-approvals-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Aprovações extraordinárias" };

export default async function AdminApprovalsPage() {
  const { id, fullName, email } = await requireSession(adminApprovalsPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminWithdrawalApprovalsScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
