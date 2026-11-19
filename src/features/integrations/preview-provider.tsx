"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { webhookError, type WebhookWorkspace } from "@/features/webhooks/webhooks";
import type { WebhookConfig } from "@/types/domain";
import { previewApiKeys, previewIpRanges, previewWebhooks, previewWithdrawalValidation } from "./preview-data";

function createWebhookPreview(): WebhookWorkspace["service"] {
  let items = previewWebhooks;

  return {
    async getWebhooks() { return items; },
    async createWebhook(values) {
      const issue = webhookError(values);
      if (issue) throw new Error(issue.message);
      const item = { ...values, id: `wh_demo_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
      items = [item, ...items];
      return item;
    },
    async updateWebhook(id, changes) {
      const webhook = items.find((item) => item.id === id);
      if (!webhook) throw new Error("Webhook não encontrado.");
      const updated: WebhookConfig = { ...webhook, ...changes, id, createdAt: webhook.createdAt };
      const issue = webhookError(updated);
      if (issue) throw new Error(issue.message);
      items = items.map((item) => item.id === id ? updated : item);
      return updated;
    },
    async deleteWebhook(id) {
      const remaining = items.filter((item) => item.id !== id);
      if (remaining.length === items.length) return false;
      items = remaining;
      return true;
    },
  };
}

function usePreviewState() {
  const [apiKeys, setApiKeys] = useState(previewApiKeys);
  const [allowedIps, setAllowedIps] = useState(previewIpRanges);
  const [withdrawalValidation, setWithdrawalValidation] = useState(previewWithdrawalValidation);
  const [service] = useState(createWebhookPreview);
  const previewId = useId();
  const webhookWorkspace: WebhookWorkspace = {
    service,
    queryKey: ["integrations-preview", "webhooks", previewId],
    readOnly: false,
  };

  return { apiKeys, setApiKeys, allowedIps, setAllowedIps, withdrawalValidation, setWithdrawalValidation, webhookWorkspace };
}

const IntegrationsPreviewContext = createContext<ReturnType<typeof usePreviewState> | null>(null);

export function IntegrationsPreviewProvider({ children }: { children: ReactNode }) {
  const value = usePreviewState();
  return <IntegrationsPreviewContext.Provider value={value}>{children}</IntegrationsPreviewContext.Provider>;
}

export function useIntegrationsPreview() {
  const context = useContext(IntegrationsPreviewContext);
  if (!context) throw new Error("IntegrationsPreviewProvider ausente.");
  return context;
}
