import type { Metadata } from "next";
import { adminPreferencesPath } from "@/features/admin/admin-preferences";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPreferencesScreen } from "@/features/admin/components/admin-preferences-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Preferências" };

export default async function AdminPreferencesPage() {
  const { id, fullName, email } = await requireSession(adminPreferencesPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminPreferencesScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
