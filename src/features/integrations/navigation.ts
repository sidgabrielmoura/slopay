import { FileText, KeyRound, LockKeyhole, Plug, Webhook } from "lucide-react";
import { webhooksPath } from "@/features/webhooks/webhooks";

export const integrationsPath = "/integracoes";
export const apiKeysPath = `${integrationsPath}/chaves-api`;
export const integrationSecurityPath = `${integrationsPath}/seguranca`;
export const integrationLogsPath = `${integrationsPath}/logs`;
export const webhookLogsPath = `${integrationLogsPath}?aba=webhooks`;

export const integrationsItem = { title: "Integrações", path: integrationsPath, icon: Plug };

export const integrationNavigation = [
  { title: "Chaves de API", path: apiKeysPath, icon: KeyRound },
  { title: "Segurança", path: integrationSecurityPath, icon: LockKeyhole },
  { title: "Webhooks", path: webhooksPath, icon: Webhook },
  { title: "Logs", path: integrationLogsPath, icon: FileText },
];

export function isIntegrationRoute(pathname: string | null) {
  return pathname === integrationsPath || pathname?.startsWith(`${integrationsPath}/`) === true;
}
