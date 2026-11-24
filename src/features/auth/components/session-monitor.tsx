"use client";

import { useEffect } from "react";
import { authEntry } from "@/lib/auth-navigation";
import { authApiService, type SessionStatus } from "@/services/auth-api.service";
import { redirectExpiredSession } from "../session-expiry";
import { refreshMargin, sessionCanResume, sessionEnded, sessionErrorCode, withSessionLock } from "../session-refresh";

const activityInterval = 60_000;
const actions = ["pointerdown", "keydown", "wheel", "input"] as const;

export function SessionMonitor() {
  useEffect(() => {
    let status: SessionStatus | undefined;
    let timeout: number | undefined;
    let stopped = false;
    let refreshing = false;
    let lastActivitySent = 0;
    let pendingActivity = false;

    function leave(page: "/renovar" | "/entrar") {
      if (stopped) return;
      stopped = true;
      const returnTo = window.location.pathname + window.location.search;
      if (page === "/entrar") redirectExpiredSession(returnTo);
      else window.location.replace(authEntry(page, returnTo));
    }

    function schedule(delay: number) {
      window.clearTimeout(timeout);
      if (!stopped) timeout = window.setTimeout(sync, Math.max(delay, 200));
    }

    function refreshAt(current: SessionStatus) {
      const absolute = Date.parse(current.absoluteExpiresAt);
      if (current.accessExpiresAt && current.accessExpiresAt >= absolute - 1_500) return absolute;
      return (current.accessExpiresAt ?? Date.now()) - refreshMargin;
    }

    function scheduleNext() {
      if (!status) return schedule(15_000);
      const target = Math.min(
        Date.parse(status.idleExpiresAt),
        Date.parse(status.absoluteExpiresAt),
        refreshAt(status),
        pendingActivity ? lastActivitySent + activityInterval : Infinity,
      );
      schedule(target - Date.now());
    }

    async function sync() {
      if (stopped || refreshing) return;
      if (status && Date.now() >= Date.parse(status.absoluteExpiresAt)) return leave("/entrar");
      refreshing = true;
      window.clearTimeout(timeout);
      try {
        await withSessionLock(async () => {
          if (stopped) return;
          status = await authApiService.sessionStatus();
          if (stopped) return;
          if (status.state === "locked") return leave("/renovar");

          if (Date.now() >= refreshAt(status)) {
            await authApiService.refresh();
            status = await authApiService.sessionStatus();
            if (stopped) return;
            if (status.state === "locked") return leave("/renovar");
          }
          if (pendingActivity && Date.now() - lastActivitySent >= activityInterval) {
            pendingActivity = false;
            const times = await authApiService.recordActivity();
            lastActivitySent = Date.now();
            status = { ...status, ...times };
          }
        });
        scheduleNext();
      } catch (error) {
        const now = Date.now();
        if (sessionEnded(error) || (status && now >= Date.parse(status.absoluteExpiresAt))) leave("/entrar");
        else if (sessionErrorCode(error) === "SESSION_IDLE" || (status && now >= Date.parse(status.idleExpiresAt))) leave("/renovar");
        else schedule(sessionCanResume(error) ? 800 : 15_000);
      } finally {
        refreshing = false;
      }
    }

    function recordActivity(event: Event) {
      if (stopped || !event.isTrusted || document.visibilityState !== "visible") return;
      pendingActivity = true;
      if (refreshing) return;
      if (Date.now() - lastActivitySent >= activityInterval) void sync();
      else scheduleNext();
    }

    function resumeVisible() {
      if (document.visibilityState === "visible") void sync();
    }

    for (const action of actions) window.addEventListener(action, recordActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", resumeVisible);
    window.addEventListener("slopay:session-check", sync);
    void sync();

    return () => {
      stopped = true;
      window.clearTimeout(timeout);
      for (const action of actions) window.removeEventListener(action, recordActivity, true);
      document.removeEventListener("visibilitychange", resumeVisible);
      window.removeEventListener("slopay:session-check", sync);
    };
  }, []);

  return null;
}
