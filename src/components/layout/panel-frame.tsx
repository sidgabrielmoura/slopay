import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PanelFrame({
  sidebar,
  topbar,
  bottomNav,
  children,
  className,
}: {
  sidebar: ReactNode;
  topbar: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-dvh w-full overflow-hidden bg-background", className)}>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {topbar}
        {/* Keep absolutely positioned form controls inside the panel scroll area. */}
        <main className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-12">
          <div className="mx-auto w-full max-w-[1440px] space-y-8 animate-in fade-in-50 duration-150">
            {children}
          </div>
        </main>
        {bottomNav}
      </div>
    </div>
  );
}

export function PanelTopbarFrame({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4 sm:gap-4 sm:px-6 lg:px-8">
      {children}
    </header>
  );
}
