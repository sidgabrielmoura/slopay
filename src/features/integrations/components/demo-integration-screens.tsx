"use client";

import { useDemoScenario } from "@/providers/demo-provider";
import { ApiKeysScreen } from "./api-keys-screen";
import { IntegrationSecurityScreen } from "./integration-security-screen";

export function DemoApiKeysScreen() {
  const { isReadOnly } = useDemoScenario();
  return <ApiKeysScreen readOnly={isReadOnly} />;
}

export function DemoIntegrationSecurityScreen() {
  const { isReadOnly } = useDemoScenario();
  return <IntegrationSecurityScreen readOnly={isReadOnly} />;
}
