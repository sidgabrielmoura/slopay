"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { QueryProvider } from "@/providers/query-provider";
import { PreferencesProvider } from "@/providers/preferences-provider";
import { toast, Toaster } from "sonner";

const DevelopmentFeatures = createContext(false);

export function useDevelopmentFeatures() {
  return useContext(DevelopmentFeatures);
}

export function AppProviders({ children, developmentFeatures }: { children: ReactNode; developmentFeatures: boolean }) {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem("slopay_demo_session");
    } catch {
      // Storage may be disabled by the browser.
    }
  }, []);

  useEffect(() => {
    let firstInvalidField: HTMLElement | null = null;
    let focusTimer: number | undefined;

    function notifyInvalidField(event: Event) {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) || !field.form) return;
      event.preventDefault();
      if (firstInvalidField) return;
      firstInvalidField = field;
      const label = field.labels?.[0]?.textContent?.trim();
      toast.error(label || "Confira o formulário.", { description: field.validationMessage, id: "native-form-validation" });
      focusTimer = window.setTimeout(() => {
        firstInvalidField = null;
        if (field.isConnected) field.focus();
      }, 0);
    }

    document.addEventListener("invalid", notifyInvalidField, true);
    return () => {
      document.removeEventListener("invalid", notifyInvalidField, true);
      window.clearTimeout(focusTimer);
    };
  }, []);

  return (
    <QueryProvider>
      <PreferencesProvider>
        <DevelopmentFeatures value={developmentFeatures}>{children}</DevelopmentFeatures>
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          icons={{ loading: <LoadingIndicator /> }}
          containerAriaLabel="Notificações"
          toastOptions={{
            closeButtonAriaLabel: "Fechar notificação",
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
