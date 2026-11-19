import type { Metadata } from "next";
import { adminReportsPath } from "@/features/admin/admin-reports";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminReportsScreen } from "@/features/admin/components/admin-reports-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Relatórios e Fechamentos" };

export default async function AdminReportsPage() {
  const { id, fullName, email } = await requireSession(adminReportsPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminReportsScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
