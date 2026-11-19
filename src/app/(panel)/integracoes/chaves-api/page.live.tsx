import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxIntegrationKeysScreen } from "@/features/integrations/components/sandbox-integration-keys-screen";
import { apiKeysPath } from "@/features/integrations/navigation";
import { loadSandboxIntegrationKeys } from "@/lib/server/sandbox-integration-keys";

export const metadata = { title: "Chaves de API" };

export default function ApiKeysPage() {
  return <LiveIntegrationPage path={apiKeysPath}><LiveKeys /></LiveIntegrationPage>;
}

async function LiveKeys() {
  const result = await loadSandboxIntegrationKeys();
  if (result.state === "ready") {
    return <SandboxIntegrationKeysScreen key={result.company.id} companyName={result.company.legalName}
      initialKeys={result.keys} />;
  }
  return (
    <div className="grid gap-5">
      <IntegrationHeading title="Chaves de API" description="Gerencie o acesso das aplicações ao Sandbox da sua empresa." />
      <Card>
        <Empty className="rounded-none border-0" icon={<KeyRound aria-hidden="true" />}
          title={result.state === "unlinked" ? "Conta Sandbox aguardando vínculo"
            : result.state === "disabled" ? "Sandbox desativado" : "Chaves de API indisponíveis"}
          description={result.state === "unlinked" ? "A equipe do Slopay vincula a conta antes que o titular possa emitir chaves."
            : result.state === "unavailable" ? "Atualize a página em alguns instantes." : undefined} />
      </Card>
    </div>
  );
}
