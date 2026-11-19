import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxWebhookForm } from "@/features/webhooks/components/sandbox-webhook-form";
import { newWebhookPath } from "@/features/webhooks/webhooks";

export const metadata = { title: "Novo webhook" };

export default function NewWebhookPage() {
  return (
    <LiveIntegrationPage path={newWebhookPath}>
      {(user) => <SandboxWebhookForm key={user.id} accountId={user.id} />}
    </LiveIntegrationPage>
  );
}
