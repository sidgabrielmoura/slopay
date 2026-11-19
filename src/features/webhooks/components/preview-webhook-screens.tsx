"use client";

import { useIntegrationsPreview } from "@/features/integrations/preview-provider";
import { WebhookFormScreen } from "./webhook-form-screen";
import { WebhooksListScreen } from "./webhooks-list-screen";

export function PreviewWebhooksList() {
  const { webhookWorkspace } = useIntegrationsPreview();
  return <WebhooksListScreen {...webhookWorkspace} />;
}

export function PreviewWebhookForm({ webhookId }: { webhookId?: string }) {
  const { webhookWorkspace } = useIntegrationsPreview();
  return <WebhookFormScreen {...webhookWorkspace} webhookId={webhookId} />;
}
