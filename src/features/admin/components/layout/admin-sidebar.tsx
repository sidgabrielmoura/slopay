"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import {
  LayoutDashboard,
  AlertOctagon,
  FileCheck2,
  Building2,
  Wallet,
  ArrowDownUp,
  QrCode,
  Layers,
  ShieldAlert,
  BookOpenCheck,
  Coins,
  FileSpreadsheet,
  Sliders,
  GitBranch,
  Webhook,
  UserCog,
  History,
  Users2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  badgeVariant?: "destructive" | "default" | "outline" | "secondary";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const service = useGatewayService();

  const { data: pendingSummary } = useQuery({
    queryKey: ["admin_pending_tasks_summary"],
    queryFn: () => service.getPendingTasksSummary(),
    refetchInterval: 10000,
  });

  const pendingAppsCount = pendingSummary?.pendingApplicationsCount ?? 0;
  const pendingApprovalsCount = pendingSummary?.pendingFinancialApprovalsCount ?? 0;
  const totalUrgent = pendingSummary?.totalUrgentTasks ?? 0;

  const navGroups: NavGroup[] = [
    {
      label: "Visão Geral",
      items: [
        { title: "Dashboard Global", path: "/admin", icon: LayoutDashboard },
        {
          title: "Fila de Pendências",
          path: "/admin/pendencias",
          icon: AlertOctagon,
          badgeCount: totalUrgent,
          badgeVariant: "destructive",
        },
      ],
    },
    {
      label: "Credenciamento & Contas",
      items: [
        {
          title: "Abertura de Contas",
          path: "/admin/abertura-de-contas",
          icon: FileCheck2,
          badgeCount: pendingAppsCount,
          badgeVariant: "default",
        },
        { title: "Empresas", path: "/admin/empresas", icon: Building2 },
        { title: "Contas Operacionais", path: "/admin/contas", icon: Wallet },
      ],
    },
    {
      label: "Operações Globais",
      items: [
        { title: "Transações Pix", path: "/admin/operacoes", icon: ArrowDownUp },
        { title: "Cobranças Dinâmicas", path: "/admin/cobrancas", icon: QrCode },
        { title: "Lotes de Saída", path: "/admin/lotes", icon: Layers },
        {
          title: "Aprovações Extraordinárias",
          path: "/admin/aprovacoes-financeiras",
          icon: ShieldAlert,
          badgeCount: pendingApprovalsCount,
          badgeVariant: "destructive",
        },
      ],
    },
    {
      label: "Tesouraria & Conciliação",
      items: [
        { title: "Extrato Global", path: "/admin/extrato", icon: BookOpenCheck },
        { title: "Saldos & Posições", path: "/admin/saldos", icon: Coins },
        { title: "Relatórios & Fechamentos", path: "/admin/relatorios", icon: FileSpreadsheet },
      ],
    },
    {
      label: "Políticas & Integrações",
      items: [
        { title: "Taxas e Limites", path: "/admin/taxas-e-limites", icon: Sliders },
        { title: "Regras de Alçada", path: "/admin/regras-de-aprovacao", icon: GitBranch },
        { title: "Webhooks Globais", path: "/admin/webhooks", icon: Webhook },
      ],
    },
    {
      label: "Governança & Segurança",
      items: [
        { title: "Equipe Administrativa", path: "/admin/equipe", icon: UserCog },
        { title: "Trilha de Auditoria", path: "/admin/auditoria", icon: History },
        { title: "Usuários Credenciados", path: "/admin/usuarios", icon: Users2 },
        { title: "Preferências", path: "/admin/preferencias", icon: SlidersHorizontal },
      ],
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-sidebar transition-all duration-300 select-none z-30 shrink-0 h-screen sticky top-0",
          isCollapsed ? "w-[68px]" : "w-[264px]"
        )}
      >
        {/* Top Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!isCollapsed ? (
            <NextLink href="/admin" className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-sm shadow-sm">
                <Shield className="size-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-foreground">
                    SloPay
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border-primary/40 text-primary font-mono font-medium"
                  >
                    Superadmin
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Gestão Central
                </span>
              </div>
            </NextLink>
          ) : (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "hover:text-foreground flex items-center cursor-pointer! justify-center p-2 rounded-md bg-primary/20 transition-colors rotate-180"
              )}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/50 transition-colors",
              isCollapsed && "hidden"
            )}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const isActive =
                  pathname === item.path ||
                  (item.path !== "/admin" && pathname.startsWith(item.path));
                const Icon = item.icon;

                const navLink = (
                  <NextLink
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative",
                      isActive
                        ? "bg-secondary text-foreground font-semibold shadow-sm border border-border/80"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.title}</span>
                    )}

                    {!isCollapsed && (item.badgeCount ?? 0) > 0 && (
                      <span
                        className={cn(
                          "ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold",
                          item.badgeVariant === "destructive"
                            ? "bg-destructive/20 text-destructive border border-destructive/30"
                            : "bg-primary/20 text-primary border border-primary/30"
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
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.title}
                        {(item.badgeCount ?? 0) > 0 && ` (${item.badgeCount})`}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </div>
          ))}
        </div>

        {/* Footer Link to Client Panel */}
        <div className="p-3 border-t border-border">
          {!isCollapsed ? (
            <NextLink
              href="/inicio"
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-all group"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-[11px] font-medium truncate">Painel do Cliente</span>
              </div>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </NextLink>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <NextLink
                  href="/inicio"
                  className="flex items-center justify-center p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-all"
                >
                  <ExternalLink className="size-4" />
                </NextLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Ir para Painel do Cliente
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
