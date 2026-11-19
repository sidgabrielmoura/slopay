import type { Metadata } from "next";
import { adminApprovalRulesPath } from "@/features/admin/admin-approval-rules";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminApprovalRulesScreen } from "@/features/admin/components/admin-approval-rules-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Regras de Alçada" };

export default async function AdminApprovalRulesPage() {
  const { id, fullName, email } = await requireSession(adminApprovalRulesPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminApprovalRulesScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
