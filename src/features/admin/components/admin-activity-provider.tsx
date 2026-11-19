"use client";

import { createContext, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Building2, Webhook } from "lucide-react";
import { toast, Toaster } from "sonner";
import { NotificationCenter } from "@/components/layout/notification-center";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/dates";
import { useHydrated } from "@/hooks/use-hydrated";
import { adminActivitySchema, fetchAdminActivity, markAdminNotices, presentAdminNotice, showAdminNoticeToast, type AdminActivity, type AdminNotice } from "../admin-activity";
import { openingsPath } from "../account-openings";
import type { PendingSummary } from "../admin-pending";
import { AdminPreferencesProvider, useAdminPreferences } from "./admin-preferences-provider";

type Connection = "connecting" | "live" | "reconnecting" | "paused";
const connectionLabels: Record<Connection, string> = {
  connecting: "Conectando atualizações", live: "Atualizações em tempo real", reconnecting: "Reconectando atualizações", paused: "Atualizações pausadas nesta aba",
};
type ActivityContext = {
  summary?: PendingSummary; connection: Connection; report?: AdminActivity; loading: boolean; error: string | null;
  setPage: (page: number) => void; retry: () => void; busy: boolean; marking: boolean;
  markAll: () => void; openNotice: (notice: AdminNotice, origin: HTMLElement | null) => void;
};
const Context = createContext<ActivityContext | null>(null);
export function useAdminActivity() {
  const context = useContext(Context);
  const hydrated = useHydrated();
  return !context || hydrated ? context : {
    ...context, summary: undefined, report: undefined, connection: "connecting" as const,
    loading: true, error: null, busy: false, marking: false,
  };
}

export function AdminActivityProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  return <AdminPreferencesProvider key={accountId} accountId={accountId}>
    <AdminActivityFeed accountId={accountId}>{children}</AdminActivityFeed>
  </AdminPreferencesProvider>;
}

function AdminActivityFeed({ accountId, children }: { accountId: string; children: ReactNode }) {
  const { view } = useAdminPreferences();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [live, setLive] = useState<AdminActivity>();
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const toasterId = "admin-notices:" + accountId;
  const report = useQuery({
    queryKey: ["admin-notifications", accountId, page], queryFn: ({ signal }) => fetchAdminActivity(page, signal),
    enabled: page > 1 || connection === "reconnecting",
    staleTime: 10_000, placeholderData: (previous) => previous, retry: false,
    refetchInterval: connection === "live" ? false : 15_000,
  });
  const read = useMutation({
    mutationFn: markAdminNotices,
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["admin-notifications", accountId] }); },
    onError: (error) => { toast.error(error.message); },
  });

  const toastArrivals = useEffectEvent((arrivals: AdminNotice[]) => view
    ? arrivals.filter((item) => showAdminNoticeToast(item, view.preferences)).slice(0, 2) : []);

  useEffect(() => {
    let source: EventSource | undefined;
    let stopped = false;
    let queueRevision: string | undefined;
    const storageKey = "slopay:admin-notice-ids:" + accountId;
    let seen: Set<string> | undefined;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved) && saved.length <= 500 && saved.every((id) => typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id))) seen = new Set(saved);
    } catch { /* The in-memory set also works when storage is unavailable. */ }

    function accept(snapshot: AdminActivity) {
      if (stopped) return;
      setConnection("live"); setLive(snapshot);
      client.setQueryData(["admin-notifications", accountId, 1], snapshot);
      void client.invalidateQueries({ queryKey: ["admin-notifications", accountId], predicate: (query) => query.queryKey[2] !== 1 });
      if (queueRevision && queueRevision !== snapshot.queueRevision) {
        void client.invalidateQueries({ queryKey: ["admin-pending", accountId] });
        void client.invalidateQueries({ queryKey: ["admin-dashboard", accountId] });
      }
      queueRevision = snapshot.queueRevision;
      if (seen) {
        const arrivals = snapshot.items.filter((item) => !seen!.has(item.id));
        if (arrivals.length) void client.invalidateQueries({ queryKey: ["admin-dashboard", accountId] });
        if (arrivals.some((item) => item.referenceKey.startsWith("ACCOUNT:"))) {
          void client.invalidateQueries({ queryKey: ["admin-account-openings", accountId] });
          void client.invalidateQueries({ queryKey: ["admin-account-opening-detail", accountId] });
        }
        for (const item of toastArrivals(arrivals)) {
          const presentation = presentAdminNotice(item);
          toast(presentation.title, {
            id: "admin-event:" + item.id, toasterId, description: item.company, duration: 7000,
            action: { label: "Ver aviso", onClick: () => { origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setNotice(item); if (!item.read) read.mutate({ ids: [item.id] }); } },
          });
        }
      } else seen = new Set();
      for (const item of snapshot.items) seen.add(item.id);
      seen = new Set([...seen].slice(-500));
      try { sessionStorage.setItem(storageKey, JSON.stringify([...seen])); } catch { /* Only event identifiers are stored here. */ }
    }

    function connect() {
      source?.close();
      if (stopped || document.visibilityState !== "visible") { setConnection("paused"); return; }
      setConnection("connecting");
      if (typeof EventSource === "undefined") { setConnection("reconnecting"); return; }
      source = new EventSource("/api/admin/live");
      source.addEventListener("snapshot", (event) => {
        try { const result = adminActivitySchema.safeParse(JSON.parse((event as MessageEvent).data)); if (result.success) accept(result.data); } catch { setConnection("reconnecting"); }
      });
      source.addEventListener("heartbeat", () => setConnection("live"));
      source.addEventListener("session-ended", () => {
        source?.close(); setConnection("reconnecting"); window.dispatchEvent(new Event("slopay:session-check"));
      });
      source.addEventListener("unavailable", () => setConnection("reconnecting"));
      source.onerror = () => { if (!stopped) setConnection("reconnecting"); };
    }
    document.addEventListener("visibilitychange", connect);
    window.addEventListener("online", connect);
    connect();
    return () => { stopped = true; source?.close(); document.removeEventListener("visibilitychange", connect); window.removeEventListener("online", connect); };
  }, [accountId, client, toasterId, read.mutate]);

  return <Context.Provider value={{
    summary: live && (!report.data || Date.parse(live.generatedAt) > Date.parse(report.data.generatedAt)) ? live.summary : report.data?.summary, connection, report: report.data, loading: report.isPending,
    error: report.isError ? report.error.message : null, setPage, busy: report.isPlaceholderData,
    retry: () => { void report.refetch(); }, marking: read.isPending, markAll: () => read.mutate({ all: true }),
    openNotice: (item, trigger) => { origin.current = trigger; setNotice(item); if (!item.read) read.mutate({ ids: [item.id] }); },
  }}>
    {children}
    <Toaster id={toasterId} position="bottom-right" theme="dark" closeButton visibleToasts={2}
      containerAriaLabel="Avisos administrativos" offset={{ right: "1rem", bottom: "var(--admin-toast-bottom)" }}
      mobileOffset={{ right: "1rem", bottom: "var(--admin-toast-bottom)" }}
      className="[--admin-toast-bottom:calc(5rem+env(safe-area-inset-bottom))] lg:[--admin-toast-bottom:1.5rem]"
      toastOptions={{ style: { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" } }} />
    <Dialog open={Boolean(notice)} onOpenChange={(open) => { if (!open) setNotice(null); }}>
      <DialogContent className="max-w-lg" onCloseAutoFocus={(event) => {
        const target = origin.current?.isConnected ? origin.current : document.querySelector<HTMLElement>("[data-notification-trigger]");
        if (target) { event.preventDefault(); target.focus(); }
      }}>
        {notice && <>
          <DialogHeader><DialogTitle>{presentAdminNotice(notice).title}</DialogTitle><DialogDescription>{notice.company}</DialogDescription></DialogHeader>
          {notice.amountInCents !== null && <p className="text-3xl font-semibold tabular-nums"><PanelAmount cents={notice.amountInCents} /></p>}
          <dl className="grid gap-4 text-sm">
            <div className="grid gap-1"><dt className="text-muted-foreground">Registrado em</dt><dd>{formatDateTime(notice.createdAt, "medium")}</dd></div>
            <div className="grid gap-1"><dt className="text-muted-foreground">Identificador Slopay</dt><dd className="break-all font-mono text-xs">{notice.referenceKey.split(":")[1]}</dd></div>
          </dl>
          {notice.referenceKey.startsWith("ACCOUNT:") ? (
            <Button asChild className="h-11" onClick={() => setNotice(null)}>
              <Link href={openingsPath + "/" + encodeURIComponent(notice.referenceKey.split(":")[1])} prefetch={false}>Abrir cadastro</Link>
            </Button>
          ) : presentAdminNotice(notice).pending ? <Button asChild className="h-11" onClick={() => setNotice(null)}>
            <Link href={"/admin/pendencias?item=" + encodeURIComponent(notice.referenceKey)}>Consultar pendência</Link>
          </Button> : <p className="text-pretty text-xs text-muted-foreground">Este aviso registra uma atualização da operação.</p>}
        </>}
      </DialogContent>
    </Dialog>
  </Context.Provider>;
}

export function AdminNotifications() {
  const activity = useAdminActivity();
  if (!activity) return null;
  const data = activity.report;
  return <NotificationCenter unread={data?.unread ?? 0} loading={activity.loading} error={activity.error} onRetry={activity.retry}
    status={connectionLabels[activity.connection]} marking={activity.marking} onMarkAll={activity.markAll}
    pagination={data ? { ...data.pagination, busy: activity.busy, onPageChange: activity.setPage } : undefined}
    items={(data?.items ?? []).map((item) => {
      const presentation = presentAdminNotice(item);
      const Icon = item.referenceKey.startsWith("ACCOUNT:") ? Building2 : item.referenceKey.startsWith("WEBHOOK:") ? Webhook
        : item.referenceKey.startsWith("WITHDRAWAL:") ? ArrowUpRight : ArrowDownLeft;
      return { id: item.id, title: presentation.title, message: item.company, createdAt: item.createdAt, read: item.read,
        tone: presentation.tone, icon: <Icon className="size-4" />, getAction: () => (origin: HTMLElement | null) => activity.openNotice(item, origin) };
    })} />;
}

export function AdminConnectionStatus() {
  const activity = useAdminActivity();
  return <span className="text-xs text-muted-foreground">{connectionLabels[activity?.connection ?? "connecting"]}</span>;
}
