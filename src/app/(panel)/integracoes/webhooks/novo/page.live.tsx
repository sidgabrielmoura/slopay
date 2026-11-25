import { redirect } from "next/navigation";
import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxWebhookForm } from "@/features/webhooks/components/sandbox-webhook-form";
import { newWebhookPath, webhooksPath } from "@/features/webhooks/webhooks";
import { canActInSupport } from "@/lib/support-scope";

export const metadata = { title: "Novo webhook" };

export default function NewWebhookPage() {
  return (
    <LiveIntegrationPage path={newWebhookPath}>
      {user => {
        if (!canActInSupport(user.support, "integrations")) redirect(webhooksPath);
        return <SandboxWebhookForm key={user.id} accountId={user.id} />;
      }}
    </LiveIntegrationPage>
  );
}
