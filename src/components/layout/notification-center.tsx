"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import { Bell, Check, ChevronRight } from "lucide-react";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "./header-motion";
import { PanelAmount } from "./panel-privacy";

export type NotificationCenterItem = {
  id: string; title: string; message?: string; createdAt: string; read: boolean;
  tone?: "info" | "success" | "warning"; icon?: ReactNode; amountInCents?: number;
  prefix?: string; href?: string; onRead?: () => void;
  getAction?: () => ((origin: HTMLElement | null) => void) | undefined;
};
const toneClass = { info: "bg-info-surface text-info", success: "bg-success-surface text-success", warning: "bg-warning-surface text-warning" };

export function NotificationCenter({ items, unread, marking = false, onMarkAll, loading = false, error, onRetry, pagination, status }: {
  items: NotificationCenterItem[]; unread: number; marking?: boolean; onMarkAll?: () => void;
  loading?: boolean; error?: string | null; onRetry?: () => void; status?: string;
  pagination?: { page: number; pageSize: number; total: number; busy?: boolean; onPageChange: (page: number) => void };
}) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const afterClose = useRef<(() => void) | null>(null);

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button ref={trigger} data-notification-trigger type="button" variant="ghost" size="icon" className="relative size-11 text-muted-foreground"
        aria-label={unread ? `Notificações, ${unread} ${unread === 1 ? "não lida" : "não lidas"}` : "Notificações"}>
        <Bell aria-hidden="true" className="size-4.5" /><NotificationBadge count={unread} />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" sideOffset={12} collisionPadding={12} aria-labelledby={headingId}
      className="flex w-[min(23rem,calc(100vw-1.5rem))] max-h-(--radix-popover-content-available-height) flex-col overflow-hidden rounded-xl border-border bg-card p-0 shadow-xl"
      onCloseAutoFocus={(event) => {
        const next = afterClose.current; afterClose.current = null;
        if (next) { event.preventDefault(); next(); }
      }}>
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-1">
        <h2 ref={heading} id={headingId} tabIndex={-1} className="text-balance text-sm font-semibold outline-none">Notificações</h2>
        {unread > 0 && onMarkAll && <Button type="button" variant="ghost" size="sm" disabled={marking}
          className="h-11 px-2 text-muted-foreground" onClick={() => { heading.current?.focus({ preventScroll: true }); onMarkAll(); }}>
          <Check aria-hidden="true" />Marcar como lidas
        </Button>}
      </div>
      {status && <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{status}</p>}
      {error && <div className="border-b border-border px-4 py-3">
        <p role="status" className="text-pretty text-xs text-muted-foreground">{error}</p>
        {onRetry && <Button type="button" variant="ghost" size="sm" className="mt-1 h-11" onClick={onRetry}>Tentar novamente</Button>}
      </div>}
      {loading ? <div className="grid gap-4 p-4" aria-label="Carregando notificações" role="status">
        {[0, 1, 2].map((item) => <Skeleton key={item} aria-hidden="true" className="h-12" />)}
      </div> : items.length === 0 ? <p className="px-4 py-8 text-center text-pretty text-sm text-muted-foreground">Nenhuma notificação recente.</p> : (
        <ul role="list" className="min-h-0 max-h-88 divide-y divide-border overflow-x-hidden overflow-y-auto overscroll-contain">
          {items.map((item) => {
            const content = <>
              {item.icon && <span aria-hidden="true" className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClass[item.tone ?? "info"])}>{item.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-pretty text-sm font-medium">{!item.read && <span className="sr-only">Não lida. </span>}{item.title}</span>
                {item.message && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.message}</span>}
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.prefix}<time dateTime={item.createdAt}>{formatDateTime(item.createdAt, "short")}</time></span>
              </span>
              {item.amountInCents !== undefined && <span className="shrink-0 text-right text-sm font-medium tabular-nums"><PanelAmount cents={item.amountInCents} /></span>}
              {(item.href || item.getAction) && <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
            </>;
            const className = "flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
            const activate = () => {
              item.onRead?.();
              const action = item.getAction?.();
              if (action) afterClose.current = () => action(trigger.current);
              setOpen(false);
              return Boolean(action);
            };
            return <li key={item.id} className={cn(!item.read && "bg-muted/45")}>
              {item.href ? <Link href={item.href} prefetch={false} className={className} onClick={(event) => {
                if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                if (activate()) event.preventDefault();
              }}>{content}</Link> : item.getAction ? <button type="button" className={className} onClick={activate}>{content}</button> : <div className="flex items-center gap-3 px-4 py-3">{content}</div>}
            </li>;
          })}
        </ul>
      )}
      {pagination && <TablePagination {...pagination} busy={pagination.busy || loading} label="Paginação das notificações" />}
    </PopoverContent>
  </Popover>;
}
