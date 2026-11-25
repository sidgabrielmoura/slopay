import { SandboxIntegrationSecurity } from "@/features/integrations/components/sandbox-integration-security";
import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { integrationSecurityPath } from "@/features/integrations/navigation";
import { canActInSupport } from "@/lib/support-scope";

export const metadata = { title: "Segurança da integração" };

export default function IntegrationSecurityPage() {
  return <LiveIntegrationPage path={integrationSecurityPath}>
    {user => <SandboxIntegrationSecurity accountId={user.id} canManage={canActInSupport(user.support, "integrations")} />}
  </LiveIntegrationPage>;
}
