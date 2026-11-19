import { LiveIntegrationPage } from "@/features/integrations/components/live-integration-page";
import { integrationLogsPath, webhookLogsPath } from "@/features/integrations/navigation";
import { SandboxWebhookLogs } from "@/features/webhooks/components/sandbox-webhook-logs";
import { webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";

export const metadata = { title: "Logs de integração" };

export default async function IntegrationLogsPage({ searchParams }: {
  searchParams: Promise<{ aba?: string | string[]; destino?: string | string[] }>;
}) {
  const { aba, destino } = await searchParams;
  const tab = aba === "requisicoes" ? "requisicoes" : "webhooks";
  const destination = webhookIdSchema.safeParse(destino);
  const path = tab === "webhooks" ? webhookLogsPath + (destination.success ? "&destino=" + destination.data : "") : integrationLogsPath;
  return (
    <LiveIntegrationPage path={path}>
      {(user) => <SandboxWebhookLogs key={[user.id, tab, destination.data].join("-")} accountId={user.id}
        initialTab={tab} webhookId={destination.data} />}
    </LiveIntegrationPage>
  );
}
