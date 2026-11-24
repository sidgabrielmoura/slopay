"use client";

import { useEffect, useRef } from "react";
import { Headset, LogOut } from "lucide-react";
import { PanelFrame, PanelTopbarFrame } from "@/components/layout/panel-frame";
import { PanelPrivacyToggle } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { LiveOverviewScreen } from "@/features/overview/components/live-overview-screen";
import { ApiError } from "@/lib/api-client";
import type { DashboardOverview } from "@/lib/server/dashboard";
import { accountSupport, supportReturnHref } from "../account-support";

const contactIntervalMs = 30_000;

export function AccountSupportScreen({ id, companyId, companyName, ownerName, overview, activeForMs }: {
  id: string; companyId: string; companyName: string; ownerName: string; overview: DashboardOverview; activeForMs: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const returnHref = supportReturnHref(companyId);

  useEffect(() => {
    const controller = new AbortController();
    let expiresAt = Date.now() + activeForMs;
    let deadline: number;
    let heartbeatRunning = false;

    function leave() {
      if (panel.current) panel.current.hidden = true;
      window.location.replace(returnHref);
    }

    function scheduleExpiry() {
      window.clearTimeout(deadline);
      deadline = window.setTimeout(leave, Math.max(0, expiresAt - Date.now()));
    }

    async function contact() {
      if (leaving.current || document.visibilityState !== "visible" || heartbeatRunning) return;
      if (Date.now() >= expiresAt) return leave();
      heartbeatRunning = true;
      const sentAt = Date.now();
      try {
        const response = await accountSupport.activity(id, controller.signal);
        if (controller.signal.aborted || leaving.current) return;
        expiresAt = sentAt + response.activeForMs;
        scheduleExpiry();
      } catch (error) {
        if (!controller.signal.aborted && !leaving.current && error instanceof ApiError && [401, 403, 404].includes(error.status)) leave();
      } finally {
        heartbeatRunning = false;
      }
    }

    function endOnDeparture() {
      if (panel.current) panel.current.hidden = true;
      if (!leaving.current) void accountSupport.end(id).catch(() => undefined);
    }

    function onRestore(event: PageTransitionEvent) {
      if (event.persisted) leave();
    }

    scheduleExpiry();
    const timer = window.setInterval(contact, contactIntervalMs);
    document.addEventListener("visibilitychange", contact);
    window.addEventListener("pagehide", endOnDeparture);
    window.addEventListener("pageshow", onRestore);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.clearTimeout(deadline);
      document.removeEventListener("visibilitychange", contact);
      window.removeEventListener("pagehide", endOnDeparture);
      window.removeEventListener("pageshow", onRestore);
    };
  }, [id, activeForMs, returnHref]);

  async function closeSupport() {
    if (leaving.current) return;
    leaving.current = true;
    if (panel.current) panel.current.hidden = true;
    try {
      await accountSupport.end(id);
    } catch {
      // The backend expires sessions without a confirmed departure.
    } finally {
      window.location.replace(returnHref);
    }
  }

  return (
    <div ref={panel}>
      <PanelFrame sidebar={null} topbar={
        <PanelTopbarFrame>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
              <Headset className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{ownerName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PanelPrivacyToggle className="size-11" />
            <Button type="button" variant="outline" className="h-11" onClick={() => void closeSupport()} aria-label="Encerrar suporte">
              <LogOut aria-hidden="true" /><span className="hidden sm:inline">Encerrar suporte</span>
            </Button>
          </div>
        </PanelTopbarFrame>
      }>
        <SessionMonitor />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Modo suporte</Badge>
          <span className="text-sm text-muted-foreground">Somente leitura</span>
        </div>
        <LiveOverviewScreen data={overview} merchantId={companyId} owner={false} canReceive={false} readOnly />
      </PanelFrame>
    </div>
  );
}
