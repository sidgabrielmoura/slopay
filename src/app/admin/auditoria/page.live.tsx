import type { Metadata } from "next";
import { adminAuditPath } from "@/features/admin/admin-audit";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminAuditScreen } from "@/features/admin/components/admin-audit-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Trilha de auditoria" };

export default async function AdminAuditPage() {
  const { id, fullName, email } = await requireSession(adminAuditPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminAuditScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
