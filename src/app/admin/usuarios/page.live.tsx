import type { Metadata } from "next";
import { clientUsersPath } from "@/features/admin/admin-client-users";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminClientUsersScreen } from "@/features/admin/components/admin-client-users-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Usuários Credenciados" };

export default async function AdminClientUsersPage() {
  const { id, fullName, email } = await requireSession(clientUsersPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminClientUsersScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
