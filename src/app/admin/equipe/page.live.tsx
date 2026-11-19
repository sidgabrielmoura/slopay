import type { Metadata } from "next";
import { adminTeamPath } from "@/features/admin/admin-team";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminTeamScreen } from "@/features/admin/components/admin-team-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Equipe Administrativa" };

export default async function AdminTeamPage() {
  const { id, fullName, email } = await requireSession(adminTeamPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminTeamScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
