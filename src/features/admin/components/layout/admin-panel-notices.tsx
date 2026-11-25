"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PanelNoticeStrip, type PanelNotice } from "@/components/layout/panel-notice-strip";
import { adminPanelTips } from "../../admin-panel-tips";
import { adminPendingListKey, fetchAdminPending, pendingStateLabels, type PendingItem } from "../../admin-pending";

const [firstTip, ...restTips] = adminPanelTips;
export const tipNotices: readonly [PanelNotice, ...PanelNotice[]] = [
  { id: "tip-0", message: firstTip },
  ...restTips.map((message, index) => ({ id: `tip-${index + 1}`, message })),
];
const count = new Intl.NumberFormat("pt-BR");
const noticeLabels = { AWAITING_APPROVAL: "Saque aguarda o titular", INTERRUPTED: "Fila de webhook interrompida" };

function queueNotice(total: number): PanelNotice {
  return {
    id: "queue",
    message: total === 1 ? "Há 1 pendência em aberto." : `Há ${count.format(total)} pendências em aberto.`,
    href: "/admin/pendencias",
  };
}

function pendingNotice(item: PendingItem): PanelNotice {
  const labels = {
    ...pendingStateLabels, ...noticeLabels,
    REVIEW: item.referenceKind === "CHARGE" ? "Recebimento em revisão" : "Saque em revisão",
  };
  return {
    id: item.id,
    message: `${labels[item.state]} · ${item.company}`,
    href: `/admin/pendencias?item=${encodeURIComponent(item.id)}`,
  };
}

export function AdminPanelNotices({ accountId, pendingCount, live }: {
  accountId: string;
  pendingCount: number;
  live: boolean;
}) {
  const [page, setPage] = useState(1);
  const { data, isPlaceholderData, isError } = useQuery({
    queryKey: adminPendingListKey(accountId, "ALL", "", page),
    queryFn: ({ signal }) => fetchAdminPending("ALL", "", page, signal),
    enabled: pendingCount > 0,
    placeholderData: (previous, query) => query?.queryKey[1] === accountId ? previous : undefined,
    staleTime: 10_000,
    retry: false,
    refetchInterval: (query) => live && query.state.status !== "error" ? false : 15_000,
  });
  if (pendingCount === 0) return <PanelNoticeStrip entries={tipNotices} />;

  const [first, ...rest] = (isError ? [] : data?.items ?? []).map(pendingNotice);
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const advancePage = pagination && totalPages > 1 && !isError && !isPlaceholderData
    ? () => setPage(pagination.page % totalPages + 1)
    : undefined;

  return <PanelNoticeStrip entries={first ? [first, ...rest] : [queueNotice(pendingCount)]} onCycleEnd={advancePage} />;
}
