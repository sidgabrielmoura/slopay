import { developmentFeaturesEnabled } from "@/config/development";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxIntegrationKeysScreen } from "@/features/integrations/components/sandbox-integration-keys-screen";
import { apiKeysPath } from "@/features/integrations/navigation";
import { loadIntegrationKeys } from "@/lib/server/sandbox-integration-keys";
import { canActInSupport } from "@/lib/support-scope";

export const metadata = { title: "Chaves de API" };

export default function ApiKeysPage() {
  return <LiveIntegrationPage path={apiKeysPath}>
    {user => <LiveKeys canManage={canActInSupport(user.support, "integrations")} />}
  </LiveIntegrationPage>;
}

async function LiveKeys({ canManage }: { canManage: boolean }) {
  const development = developmentFeaturesEnabled();
  const result = await loadIntegrationKeys(development ? "sandbox" : "live");
  if (result.state === "ready") {
    return <SandboxIntegrationKeysScreen key={result.company.id} companyName={result.company.legalName}
      initialKeys={result.keys} development={development} canManage={canManage} />;
  }
  return (
    <div className="grid gap-5">
      <IntegrationHeading title="Chaves de API" description="Gerencie o acesso das aplicações à conta da sua empresa." />
      <Card>
        <Empty className="rounded-none border-0" icon={<KeyRound aria-hidden="true" />}
          title={result.state === "unlinked" ? (development ? "Conta Sandbox aguardando vínculo" : "Cadastro aguardando aprovação")
            : result.state === "disabled" && development ? "Sandbox desativado" : "Chaves de API indisponíveis"}
          description={result.state === "unlinked" ? (development ? "A equipe do Slopay vincula a conta antes que o titular possa emitir chaves." : "O titular pode emitir chaves após a aprovação do cadastro.")
            : result.state === "unavailable" ? "Atualize a página em alguns instantes."
              : !development ? "A emissão de chaves estará disponível quando a integração estiver ativa." : undefined} />
      </Card>
    </div>
  );
}
