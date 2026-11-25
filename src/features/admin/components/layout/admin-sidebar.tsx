"use client";

import { AlertOctagon, ArrowDownUp, Building2, Coins, ExternalLink, LayoutDashboard, Shield, ShieldCheck, SlidersHorizontal, Webhook } from "lucide-react";
import { PanelSidebar, type PanelSidebarGroup } from "@/components/layout/panel-sidebar";
import { adminSections, type AdminSectionId } from "../../admin-navigation";

type AdminNavigationOptions = {
  pendingSummary?: { pendingApplicationsCount?: number; pendingFinancialApprovalsCount?: number; totalUrgentTasks?: number };
  live?: boolean;
};

const icons = {
  overview: LayoutDashboard, pending: AlertOctagon, clients: Building2, pix: ArrowDownUp,
  treasury: Coins, webhooks: Webhook, governance: ShieldCheck, settings: SlidersHorizontal,
};

export function adminNavigationGroups({ pendingSummary }: AdminNavigationOptions): PanelSidebarGroup[] {
  const badges: Partial<Record<AdminSectionId, { count?: number; tone: "destructive" | "primary" }>> = {
    pending: { count: pendingSummary?.totalUrgentTasks, tone: "destructive" },
    clients: { count: pendingSummary?.pendingApplicationsCount, tone: "primary" },
    pix: { count: pendingSummary?.pendingFinancialApprovalsCount, tone: "destructive" },
  };
  const items = adminSections.map(section => ({
    title: section.title, path: section.path, icon: icons[section.id], exact: section.id === "overview",
    aliases: section.pages?.flatMap(page => [page.path, ...(page.aliases ?? [])]).filter(path => path !== section.path),
    badgeCount: badges[section.id]?.count, badgeTone: badges[section.id]?.tone,
  }));

  return [
    { label: "Operação", items: items.slice(0, 6) },
    { label: "Administração", items: items.slice(6) },
  ];
}

export function adminNavigationFooter(live: boolean) {
  return live
    ? [{ title: "Segurança da conta", path: "/conta/seguranca", icon: Shield }]
    : [{ title: "Painel do cliente", path: "/inicio", icon: ExternalLink }];
}

export function AdminSidebar({ pendingSummary, live = false }: AdminNavigationOptions) {
  return <PanelSidebar
    groups={adminNavigationGroups({ pendingSummary })}
    homePath="/admin"
    homeLabel="Início do superadmin"
    subtitle="Superadmin"
    navigationLabel="Menu do superadmin"
    footerLinks={adminNavigationFooter(live)}
  />;
}
