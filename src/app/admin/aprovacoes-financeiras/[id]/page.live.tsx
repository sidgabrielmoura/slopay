import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminApprovalId, adminApprovalsPath } from "@/features/admin/admin-withdrawal-approvals";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminWithdrawalApprovalScreen } from "@/features/admin/components/admin-withdrawal-approval-detail";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Detalhes da solicitação de saque" };

export default async function AdminApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const approvalId = adminApprovalId.safeParse((await params).id);
  if (!approvalId.success) notFound();
  const { id, fullName, email } = await requireSession(`${adminApprovalsPath}/${approvalId.data}`, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminWithdrawalApprovalScreen user={{ id, fullName, email }} approvalId={approvalId.data} />
    </AdminActivityProvider>
  );
}
