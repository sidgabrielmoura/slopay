"use client";

import { queryKeys } from "@/lib/query-keys";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import { WebhookFormScreen } from "./webhook-form-screen";
import { WebhooksListScreen } from "./webhooks-list-screen";

export function DemoWebhooksList() {
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();
  return <WebhooksListScreen service={service} queryKey={queryKeys.webhooks()} readOnly={isReadOnly} />;
}

export function DemoWebhookForm({ webhookId }: { webhookId?: string }) {
  const service = useGatewayService();
  const { activeScenario, isReadOnly } = useDemoScenario();
  return <WebhookFormScreen key={activeScenario} service={service} queryKey={queryKeys.webhooks()} readOnly={isReadOnly} webhookId={webhookId} />;
}
