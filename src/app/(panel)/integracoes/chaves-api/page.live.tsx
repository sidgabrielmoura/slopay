import { developmentFeaturesEnabled } from "@/config/development";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { SandboxIntegrationKeysScreen } from "@/features/integrations/components/sandbox-integration-keys-screen";
import { apiKeysPath } from "@/features/integrations/navigation";
import { publicIntegrationApiOrigin } from "@/lib/server/auth-backend";
import { loadIntegrationKeys } from "@/lib/server/sandbox-integration-keys";
import { canActInSupport } from "@/lib/support-scope";

export const metadata = { title: "Chaves de API" };

export default async function ApiKeysPage({ searchParams }: { searchParams: Promise<{ pagina?: string | string[] }> }) {
  const { pagina } = await searchParams;
  const requested = typeof pagina === "string" && /^[1-9]\d*$/.test(pagina) ? Number(pagina) : 1;
  const page = Number.isSafeInteger(requested) ? requested : 1;
  return <LiveIntegrationPage path={apiKeysPath}>
    {user => <LiveKeys canManage={canActInSupport(user.support, "integrations")} page={page} />}
  </LiveIntegrationPage>;
}

async function LiveKeys({ canManage, page }: { canManage: boolean; page: number }) {
  const development = developmentFeaturesEnabled();
  const result = await loadIntegrationKeys(development ? "sandbox" : "live", page);
  if (result.state === "ready") {
    return <SandboxIntegrationKeysScreen key={result.company.id} companyName={result.company.legalName}
      keys={result.keys} pagination={result.pagination} development={development} apiOrigin={publicIntegrationApiOrigin()} canManage={canManage} />;
  }
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6">
      <IntegrationHeading title="Chaves de API" description="Gerencie o acesso das aplicações à conta da sua empresa." />
      <Card>
        <Empty className="rounded-none border-0" icon={<KeyRound aria-hidden="true" />}
          title={result.state === "unlinked" ? (development ? "Conta Sandbox aguardando vínculo" : "Cadastro aguardando aprovação")
            : result.state === "disabled" ? (development ? "Sandbox desativado" : "API de produção desativada") : "Chaves de API indisponíveis"}
          description={result.state === "unlinked" ? (development ? "A equipe do Slopay vincula a conta antes que o titular possa emitir chaves." : "O titular pode emitir chaves após a aprovação do cadastro.")
            : result.state === "unavailable" ? "Atualize a página em alguns instantes."
              : "A emissão de chaves fica disponível quando a integração for habilitada neste ambiente."} />
      </Card>
    </div>
  );
}
