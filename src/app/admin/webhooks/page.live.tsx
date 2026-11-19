import type { Metadata } from "next";
import { adminWebhooksPath } from "@/features/admin/admin-webhooks";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminWebhooksScreen } from "@/features/admin/components/admin-webhooks-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Webhooks Globais" };

export default async function AdminWebhooksPage() {
  const { id, fullName, email } = await requireSession(adminWebhooksPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminWebhooksScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
