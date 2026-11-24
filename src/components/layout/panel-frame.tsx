"use client";

import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { cn } from "@/lib/utils";

type PanelKind = "admin" | "merchant";
const EnclosingPanel = createContext<PanelKind | undefined>(undefined);

function PanelContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const content = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (content.current) content.current.scrollTop = 0;
  }, [pathname]);

  return (
    <main ref={content} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-12">
      <div className="mx-auto w-full max-w-[1440px] space-y-8 animate-in fade-in-50 duration-150">
        {children}
      </div>
    </main>
  );
}

export function PanelFrame({
  sidebar,
  topbar,
  bottomNav,
  children,
  className,
  kind,
}: {
  sidebar: ReactNode;
  topbar: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
  className?: string;
  kind?: PanelKind;
}) {
  const parent = useContext(EnclosingPanel);
  if (kind && parent === kind) return children;

  return (
    <EnclosingPanel value={kind}>
      {kind && <SessionMonitor />}
      <div className={cn("flex h-dvh w-full overflow-hidden bg-background", className)}>
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {topbar}
          <PanelContent>{children}</PanelContent>
          {bottomNav}
        </div>
      </div>
    </EnclosingPanel>
  );
}

export function PanelTopbarFrame({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 sm:gap-4 sm:px-6 lg:px-8">
      {children}
    </header>
  );
}
