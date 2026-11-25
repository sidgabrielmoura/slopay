import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxWebhooksList } from "@/features/webhooks/components/sandbox-webhooks-list";
import { webhooksPath } from "@/features/webhooks/webhooks";
import { canActInSupport } from "@/lib/support-scope";

export const metadata = { title: "Webhooks" };

export default function WebhooksPage() {
  return (
    <LiveIntegrationPage path={webhooksPath}>
      {(user) => <SandboxWebhooksList key={user.id} accountId={user.id} canManage={canActInSupport(user.support, "integrations")} />}
    </LiveIntegrationPage>
  );
}
