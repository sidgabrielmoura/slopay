import { notFound } from "next/navigation";
import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxWebhookForm } from "@/features/webhooks/components/sandbox-webhook-form";
import { webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";
import { webhooksPath } from "@/features/webhooks/webhooks";
import { canActInSupport } from "@/lib/support-scope";

export const metadata = { title: "Webhook" };

export default async function WebhookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!webhookIdSchema.safeParse(id).success) notFound();
  return (
    <LiveIntegrationPage path={`${webhooksPath}/${encodeURIComponent(id)}`}>
      {(user) => <SandboxWebhookForm key={user.id + "-" + id} accountId={user.id} webhookId={id}
        canManage={canActInSupport(user.support, "integrations")} />}
    </LiveIntegrationPage>
  );
}
