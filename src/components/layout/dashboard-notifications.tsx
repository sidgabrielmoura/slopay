"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Notification } from "@/types/domain";
import { pixNoticeKey, useDashboardPixNotices } from "./dashboard-pix-notices";
import { NotificationCenter, type NotificationCenterItem } from "./notification-center";

export function DashboardNotifications({ otherNotices = [], onReadOther, markingOther = false }: {
  otherNotices?: Notification[]; onReadOther?: () => void; markingOther?: boolean;
}) {
  const { store, notices } = useDashboardPixNotices();
  const items: NotificationCenterItem[] = notices.map((notice) => {
    const key = pixNoticeKey(notice);
    const receiving = notice.kind === "receive";
    const Icon = receiving ? ArrowDownLeft : ArrowUpRight;
    return {
      id: key, title: notice.title, createdAt: new Date(notice.receivedAt).toISOString(), read: notice.read,
      tone: notice.tone, icon: <Icon className="size-4" />, amountInCents: notice.amountInCents,
      prefix: notice.simulated ? "Saque simulado · " : undefined,
      href: store?.mode === "demo" && receiving ? "/pix/cobrancas/" + encodeURIComponent(notice.id)
        : "/movimentacoes/" + (receiving ? "" : "saque-") + encodeURIComponent(notice.id),
      onRead: () => store?.markRead(key), getAction: () => store?.getAction(key),
    };
  });
  items.push(...otherNotices.map((notice) => ({
    id: "demo:" + notice.id, title: notice.title, message: notice.message, createdAt: notice.createdAt, read: notice.read,
  })));
  return <NotificationCenter items={items} unread={items.filter((item) => !item.read).length} marking={markingOther}
    onMarkAll={() => { store?.markRead(); if (otherNotices.some((notice) => !notice.read)) onReadOther?.(); }} />;
}
