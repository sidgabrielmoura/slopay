"use client";

import { useEffect, useRef, useState } from "react";
import { Headset, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { ApiError } from "@/lib/api-client";
import { supportScopeMeta, type PanelSupportSession } from "@/lib/support-scope";
import { accountSupport, supportReturnHref } from "../account-support";

const activityInterval = 25_000;
const events = ["pointerdown", "keydown", "wheel", "input"] as const;

export function SupportAccessControl({ session }: { session: PanelSupportSession }) {
  const { id, companyId, activeForMs } = session;
  const returnHref = supportReturnHref(companyId);
  const ending = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let expiresAt = Date.now() + activeForMs;
    let deadline: number;
    let lastContact = 0;
    let pending = false;
    let writing = false;

    async function leave() {
      if (ending.current) return;
      ending.current = true;
      try { await accountSupport.end(id); } finally { window.location.replace(returnHref); }
    }

    function schedule() {
      window.clearTimeout(deadline);
      deadline = window.setTimeout(() => void leave().catch(() => undefined), Math.max(0, expiresAt - Date.now()));
    }

    async function contact() {
      if (ending.current || writing || !pending || document.visibilityState !== "visible" ||
          Date.now() - lastContact < activityInterval) return;
      if (Date.now() >= expiresAt) return leave();
      writing = true;
      pending = false;
      const sent = Date.now();
      try {
        const response = await accountSupport.activity(id, controller.signal);
        if (controller.signal.aborted || ending.current) return;
        lastContact = sent;
        expiresAt = sent + response.activeForMs;
        schedule();
      } catch (error) {
        if (controller.signal.aborted || ending.current) return;
        if (error instanceof ApiError && [403, 404, 409].includes(error.status)) return leave();
        if (error instanceof ApiError && error.status === 401) window.dispatchEvent(new Event("slopay:session-check"));
        pending = true;
      } finally {
        writing = false;
      }
    }

    const noteActivity = (event: Event) => {
      if (event.isTrusted) {
        pending = true;
        void contact().catch(() => undefined);
      }
    };
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() >= expiresAt) void leave().catch(() => undefined);
    };
    const contextChanged = () => { void leave().catch(() => undefined); };
    schedule();
    const timer = window.setInterval(() => void contact().catch(() => undefined), activityInterval);
    for (const event of events) window.addEventListener(event, noteActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("slopay:support-ended", contextChanged);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.clearTimeout(deadline);
      for (const event of events) window.removeEventListener(event, noteActivity, true);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("slopay:support-ended", contextChanged);
    };
  }, [id, activeForMs, returnHref]);

  async function end() {
    if (ending.current) return;
    ending.current = true;
    setBusy(true);
    try { await accountSupport.end(id); } catch {
      // If the server is unreachable, the existing deadline closes the support session.
    } finally {
      window.location.replace(returnHref);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <meta name={supportScopeMeta} content={id} />
      <Badge variant="secondary" className="hidden gap-1 whitespace-nowrap sm:inline-flex">
        <Headset className="size-3" aria-hidden="true" /> Suporte
      </Badge>
      <Button type="button" variant="ghost" className="h-11 px-2 sm:px-3" onClick={() => void end()}
        disabled={busy} aria-label="Encerrar suporte">
        {busy ? <LoadingIndicator /> : <LogOut aria-hidden="true" />}
        <span className="hidden sm:inline">Encerrar suporte</span>
      </Button>
    </div>
  );
}
