import { IntegrationLogsScreen } from "@/features/integrations/components/integration-logs-screen";
import { logTabFromQuery } from "@/features/integrations/preview-logs";

export const metadata = { title: "Logs de integração" };

export default async function IntegrationLogsPage({ searchParams }: { searchParams: Promise<{ aba?: string | string[] }> }) {
  const { aba } = await searchParams;
  const tab = logTabFromQuery(aba);
  return <IntegrationLogsScreen key={tab} initialTab={tab} />;
}
