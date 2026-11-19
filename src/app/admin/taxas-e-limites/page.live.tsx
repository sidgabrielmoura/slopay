import type { Metadata } from "next";
import { adminPixFeesPath } from "@/features/admin/admin-pix-fees";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPixFeesScreen } from "@/features/admin/components/admin-pix-fees-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Taxas e Limites" };

export default async function AdminPixFeesPage() {
  const { id, fullName, email } = await requireSession(adminPixFeesPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminPixFeesScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
