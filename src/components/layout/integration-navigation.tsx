"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { integrationNavigation } from "@/features/integrations/navigation";

export const panelNavItemClass = "group relative flex min-h-10 min-w-0 items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";

export function IntegrationsBackButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Voltar ao menu principal"
      className={cn("grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring", className)}
      {...props}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
    </button>
  );
}

export function IntegrationNavigation({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu de integrações" className={cn("flex min-h-0 flex-col gap-3", className)}>
      <ul className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto">
        {integrationNavigation.map(({ title, path, icon: Icon }) => {
          const active = pathname === path || pathname?.startsWith(`${path}/`);
          return (
            <li key={path}>
              <Link
                href={path}
                prefetch={false}
                scroll={false}
                onNavigate={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(panelNavItemClass, "min-h-11", active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground")}
              >
                <Icon aria-hidden="true" className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {title}
              </Link>
            </li>
          );
        })}
      </ul>
      <Button asChild size="lg" className="w-full shrink-0 justify-between px-3 text-sm focus-visible:ring-offset-sidebar">
        <a href="https://doc.slopay.com.br/" target="_blank" rel="noopener noreferrer">
          <span>Documentação<span className="sr-only"> (abre em nova aba)</span></span>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </Button>
    </nav>
  );
}
