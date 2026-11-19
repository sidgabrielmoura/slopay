import type { Metadata } from "next";
import { globalStatementPath } from "@/features/admin/admin-global-statement";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminGlobalStatementScreen } from "@/features/admin/components/admin-global-statement-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Extrato Global" };

export default async function AdminGlobalStatementPage() {
  const { id, fullName, email } = await requireSession(globalStatementPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminGlobalStatementScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
