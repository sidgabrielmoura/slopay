"use client";

import { useEffect, type ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem("slopay_demo_session");
    } catch {
      // Storage may be disabled by the browser.
    }
  }, []);

  return (
    <QueryProvider>
      <PreferencesProvider>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--foreground)",
              borderColor: "var(--border)",
            },
          }}
        />
      </PreferencesProvider>
    </QueryProvider>
  );
}
