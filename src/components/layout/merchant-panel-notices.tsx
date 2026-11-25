"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  withdrawalApprovalReviewHref, withdrawalApprovalsGateway, withdrawalApprovalsKey,
} from "@/features/approvals/sandbox-withdrawal-approvals";
import { sandboxWebhookGateway, sandboxWebhookKey } from "@/features/webhooks/sandbox-webhook-gateway";
import { webhooksPath } from "@/features/webhooks/webhooks";
import { ApiError } from "@/lib/api-client";
import { useDevelopmentFeatures } from "@/providers/app-providers";
import { merchantPanelTips } from "./merchant-panel-tips";
import { PanelNoticeStrip, type PanelNotice } from "./panel-notice-strip";

function accessUnavailable(error: unknown) {
  return error instanceof ApiError && [401, 403, 404, 409].includes(error.status);
}

export function MerchantPanelNotices({ accountId }: { accountId: string }) {
  const development = useDevelopmentFeatures();
  const [before, setBefore] = useState<string>();
  const pending = useQuery({
    queryKey: [...withdrawalApprovalsKey(accountId, development), "pending", before],
    queryFn: ({ signal }) => withdrawalApprovalsGateway(development).list("pending", before, signal),
    placeholderData: (previous, query) => query?.queryKey[1] === accountId && query.queryKey[2] === development ? previous : undefined,
    staleTime: 15_000, retry: false, refetchOnWindowFocus: true,
    refetchInterval: (query) => accessUnavailable(query.state.error) ? false : 30_000,
  });
  const webhooks = useQuery({
    queryKey: sandboxWebhookKey(accountId),
    queryFn: ({ signal }) => sandboxWebhookGateway.list(signal),
    staleTime: 60_000, retry: false, refetchOnWindowFocus: true,
    refetchInterval: (query) => accessUnavailable(query.state.error) ? false : 60_000,
  });

  const environment = development ? "sandbox" : "live";
  const pendingItems = pending.data?.items.filter((item) => item.state === "AWAITING_APPROVAL" && item.environment === environment) ?? [];
  if (before && (pending.isError || (pending.isSuccess && !pending.isPlaceholderData && !pendingItems.length))) {
    setBefore(undefined);
  }

  const notices: PanelNotice[] = accessUnavailable(pending.error) ? [] : pendingItems.map((item) => ({
    id: `withdrawal:${item.id}`,
    message: `Saque ${item.id.slice(0, 8)} aguarda sua aprovação.`,
    href: withdrawalApprovalReviewHref(item.id),
  }));
  if ((!before || pending.isPlaceholderData) && !accessUnavailable(webhooks.error) && webhooks.data?.connected) {
    for (const webhook of webhooks.data.webhooks) {
      if (webhook.enabled && webhook.interruptedAt) notices.push({
        id: `webhook:${webhook.id}`,
        message: `Fila interrompida no webhook ${webhook.name}.`,
        href: webhooksPath,
      });
    }
  }

  const [first, ...rest] = notices;
  const next = pending.data?.nextCursor ?? undefined;
  const advance = first && !pending.isPlaceholderData && (next || before) ? () => setBefore(next) : undefined;
  return <PanelNoticeStrip entries={first ? [first, ...rest] : merchantPanelTips} onCycleEnd={advance} />;
}
