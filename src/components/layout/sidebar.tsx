"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  BarChart3,
  Percent,
  User,
  ShieldCheck,
  Users2,
  GitBranch,
  Webhook,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
} from "lucide-react";
import { brandConfig } from "@/config/brand.config";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const service = useGatewayService();

  const { data: approvalsData } = useQuery({
    queryKey: queryKeys.approvals("PENDING"),
    queryFn: () => service.getApprovals("PENDING"),
  });

  const pendingApprovals = approvalsData?.pendingCount ?? 0;

  const navGroups: NavGroup[] = [
    {
      label: "Principal",
      items: [
        { title: "Início", path: "/inicio", icon: LayoutDashboard },
        { title: "Movimentações", path: "/movimentacoes", icon: ReceiptText },
      ],
    },
    {
      label: "Operações Pix",
      items: [
        { title: "Receber Pix", path: "/pix/receber", icon: ArrowDownLeft },
        { title: "Saque direto", path: "/pix/saque-direto", icon: ArrowUpRight },
        { title: "Saques em lote", path: "/pix/saques-em-lote", icon: Layers },
        {
          title: "Aprovações",
          path: "/aprovacoes",
          icon: CheckCircle2,
          badgeCount: pendingApprovals,
        },
      ],
    },
    {
      label: "Gestão",
      items: [
        { title: "Indicadores", path: "/indicadores", icon: BarChart3 },
      ],
    },
    {
      label: "Conta & Integrações",
      items: [
        { title: "Taxas e limites", path: "/conta/taxas-e-limites", icon: Percent },
        { title: "Perfil", path: "/conta/perfil", icon: User },
        { title: "Segurança", path: "/conta/seguranca", icon: ShieldCheck },
        { title: "Usuários", path: "/conta/usuarios", icon: Users2 },
        { title: "Regras de aprovação", path: "/conta/regras-de-aprovacao", icon: GitBranch },
        { title: "Webhooks", path: "/integracoes/webhooks", icon: Webhook },
      ],
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 select-none z-30 shrink-0",
          isCollapsed ? "w-[64px]" : "w-[248px]"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!isCollapsed ? (
            <NextLink href="/inicio" className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-base">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-foreground">
                  {brandConfig.name}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Operações Pix
                </span>
              </div>
            </NextLink>
          ) : (
            <NextLink href="/inicio" className="mx-auto">
              <div className="size-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-base">
                G
              </div>
            </NextLink>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "text-sidebar-foreground hover:text-foreground p-1 rounded-md hover:bg-sidebar-accent transition-colors",
              isCollapsed && "hidden"
            )}
            title={isCollapsed ? "Expandir menu (Ctrl+B)" : "Recolher menu (Ctrl+B)"}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.path ||
                  (item.path !== "/inicio" && pathname?.startsWith(item.path));

                const linkContent = (
                  <NextLink
                    href={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                    {item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span
                        className={cn(
                          "ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-warning-surface text-warning border border-[#483e29]"
                        )}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </NextLink>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.title}
                        {item.badgeCount ? ` (${item.badgeCount} pendentes)` : ""}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.path}>{linkContent}</div>;
              })}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="flex w-full items-center justify-center p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expandir menu</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground">
              <NextLink
                href="/ajuda"
                className="hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="size-3.5" />
                <span>Ajuda</span>
              </NextLink>
              <NextLink
                href="/preferencias"
                className="hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <Settings className="size-3.5" />
                <span>Ajustes</span>
              </NextLink>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
