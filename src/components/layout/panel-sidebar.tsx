"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { brandConfig } from "@/config/brand.config";
import { integrationsPath, isIntegrationRoute } from "@/features/integrations/navigation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IntegrationNavigation, IntegrationsBackButton, panelNavItemClass } from "./integration-navigation";
import styles from "./sidebar.module.css";

const badgeColors = {
  warning: "border border-warning/30 bg-warning-surface text-warning",
  primary: "border border-primary/30 bg-primary/20 text-primary",
  destructive: "border border-destructive/30 bg-destructive/20 text-destructive",
};

type SidebarLink = { title: string; path: string; icon: LucideIcon };
type SidebarItem = SidebarLink & {
  exact?: boolean;
  badgeCount?: number;
  badgeTone?: keyof typeof badgeColors;
};
export type PanelSidebarGroup = { label: string; items: readonly SidebarItem[] };

export function PanelSidebar({
  groups, homePath, homeLabel, subtitle, navigationLabel, footerLinks, showIntegrations = false,
}: {
  groups: readonly PanelSidebarGroup[];
  homePath: string;
  homeLabel: string;
  subtitle: string;
  navigationLabel: string;
  footerLinks?: readonly SidebarLink[];
  showIntegrations?: boolean;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuChoice, setMenuChoice] = useState<{ pathname: string | null; open: boolean }>();
  const navigationId = useId();
  const integrationsId = useId();
  const collapseTrigger = useRef<HTMLButtonElement>(null);
  const expandTrigger = useRef<HTMLButtonElement>(null);
  const restoreToggleFocus = useRef(false);
  const integrationsTrigger = useRef<HTMLButtonElement>(null);
  const integrationsBack = useRef<HTMLButtonElement>(null);
  const moveMenuFocus = useRef(false);
  const integrationsOpen = showIntegrations && (menuChoice && menuChoice.pathname === pathname
    ? menuChoice.open
    : isIntegrationRoute(pathname));

  function toggle() {
    restoreToggleFocus.current = document.activeElement === collapseTrigger.current ||
      document.activeElement === expandTrigger.current;
    setIsCollapsed((collapsed) => !collapsed);
  }

  function setIntegrationsOpen(open: boolean) {
    moveMenuFocus.current = true;
    setMenuChoice({ pathname, open });
  }

  useLayoutEffect(() => {
    if (!restoreToggleFocus.current) return;
    restoreToggleFocus.current = false;
    (isCollapsed ? expandTrigger : collapseTrigger).current?.focus({ preventScroll: true });
  }, [isCollapsed]);

  useLayoutEffect(() => {
    if (!moveMenuFocus.current) return;
    moveMenuFocus.current = false;
    if (integrationsOpen) integrationsBack.current?.focus({ preventScroll: true });
    else integrationsTrigger.current?.focus();
  }, [integrationsOpen]);

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        data-collapsed={isCollapsed}
        data-integrations-open={integrationsOpen}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !integrationsOpen) return;
          event.preventDefault();
          setIntegrationsOpen(false);
        }}
        className={cn(
          styles.sidebar,
          "sticky top-0 hidden h-dvh shrink-0 select-none flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col" inert={integrationsOpen} aria-hidden={integrationsOpen || undefined}>
          {/* Brand Header */}
          <div className={cn(styles.header, "flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4")}>
            <NextLink href={homePath} prefetch={false} aria-label={homeLabel}
              className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <div aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/20 text-base font-bold text-primary">
                G
              </div>
              <div aria-hidden="true" className={cn(styles.label, "flex min-w-0 flex-col")}>
                <span className="text-sm font-semibold tracking-tight text-foreground">{brandConfig.name}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{subtitle}</span>
              </div>
            </NextLink>
            <button
              ref={collapseTrigger}
              onClick={toggle}
              className={cn(styles.label, "grid size-11 shrink-0 place-items-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}
              type="button"
              aria-label="Recolher menu"
              aria-controls={navigationId}
              aria-expanded={!isCollapsed}
              aria-hidden={isCollapsed}
              tabIndex={isCollapsed ? -1 : undefined}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav id={navigationId} aria-label={navigationLabel} className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-2 py-3">
            {groups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p aria-hidden={isCollapsed} className={cn(styles.groupTitle, "px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80")}>
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const badgeCount = item.badgeCount ?? 0;
                  const isActive = pathname === item.path || (!item.exact && pathname?.startsWith(item.path + "/"));
                  const itemClass = cn(panelNavItemClass, isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground");
                  const iconClass = cn("size-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground");

                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        {showIntegrations && item.path === integrationsPath ? (
                          <button
                            ref={integrationsTrigger}
                            type="button"
                            className={cn(itemClass, "w-full text-left")}
                            aria-label={item.title}
                            aria-expanded={integrationsOpen}
                            aria-controls={integrationsId}
                            onClick={() => setIntegrationsOpen(true)}
                          >
                            <Icon aria-hidden="true" className={iconClass} />
                            <span aria-hidden="true" className={cn(styles.label, "truncate")}>{item.title}</span>
                            <ChevronRight aria-hidden="true" className={cn(styles.label, "ml-auto size-4 shrink-0 text-muted-foreground")} />
                          </button>
                        ) : (
                          <NextLink
                            href={item.path}
                            prefetch={false}
                            aria-current={isActive ? "page" : undefined}
                            aria-label={item.title + (badgeCount > 0 ? `, ${badgeCount} pendentes` : "")}
                            className={itemClass}
                          >
                            <Icon aria-hidden="true" className={iconClass} />
                            <span aria-hidden="true" className={cn(styles.label, "truncate")}>{item.title}</span>
                            {badgeCount > 0 && (
                              <span aria-hidden="true" className={cn(
                                styles.badge,
                                "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                                isActive ? "bg-primary text-primary-foreground" : badgeColors[item.badgeTone ?? "warning"],
                              )}>
                                {badgeCount > 99 ? "99+" : badgeCount}
                              </span>
                            )}
                          </NextLink>
                        )}
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                          {badgeCount ? ` (${badgeCount} pendentes)` : ""}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="relative h-15 shrink-0 border-t border-sidebar-border p-2">
            {footerLinks?.length ? (
              <div aria-hidden={isCollapsed} inert={isCollapsed} className={cn(styles.footerLinks, styles.label, "flex h-11 items-center justify-between px-3 text-xs text-muted-foreground")}>
                {footerLinks.map(({ path, title, icon: Icon }) => (
                  <NextLink key={path} href={path} prefetch={false}
                    className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{title}</span>
                  </NextLink>
                ))}
              </div>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <button ref={expandTrigger} onClick={toggle} type="button" aria-label="Expandir menu"
                  aria-controls={navigationId} aria-expanded={!isCollapsed} aria-hidden={!isCollapsed}
                  tabIndex={isCollapsed ? undefined : -1}
                  className={cn(styles.expandTrigger, "absolute inset-x-2 top-2 grid h-11 place-items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring")}>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Expandir menu</TooltipContent>}
            </Tooltip>
          </div>
        </div>
        {showIntegrations && (
          <div
            id={integrationsId}
            data-open={integrationsOpen}
            inert={!integrationsOpen}
            aria-hidden={!integrationsOpen || undefined}
            className={cn(styles.integrationsPanel, "absolute inset-y-0 left-0 z-10 flex flex-col border-l border-sidebar-border bg-sidebar")}
          >
            <div className="flex h-16 shrink-0 items-center gap-1 border-b border-sidebar-border px-2">
              <IntegrationsBackButton ref={integrationsBack} onClick={() => setIntegrationsOpen(false)} />
              <h2 className="text-balance text-sm font-semibold">Integrações</h2>
            </div>
            <IntegrationNavigation className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3" />
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
