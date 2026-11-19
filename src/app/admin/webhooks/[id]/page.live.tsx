import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminWebhooksPath } from "@/features/admin/admin-webhooks";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminWebhookScreen } from "@/features/admin/components/admin-webhook-screen";
import { webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Entregas do webhook" };

export default async function AdminWebhookPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = webhookIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const webhookId = parsed.data.toLowerCase();
  const { id, fullName, email } = await requireSession(adminWebhooksPath + "/" + webhookId, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminWebhookScreen key={webhookId} user={{ id, fullName, email }} webhookId={webhookId} />
    </AdminActivityProvider>
  );
}
