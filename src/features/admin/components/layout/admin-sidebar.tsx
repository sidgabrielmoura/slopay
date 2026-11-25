"use client";

import {
  AlertOctagon, ArrowDownUp, Building2, ExternalLink, FileCheck2, FileSpreadsheet,
  History, Layers, LayoutDashboard, Shield, ShieldAlert, Sliders, SlidersHorizontal,
  UserCog, Users2, WalletCards, Webhook,
} from "lucide-react";
import { PanelSidebar, type PanelSidebarGroup } from "@/components/layout/panel-sidebar";

type AdminNavigationOptions = {
  pendingSummary?: { pendingApplicationsCount?: number; pendingFinancialApprovalsCount?: number; totalUrgentTasks?: number };
  live?: boolean;
};

export function adminNavigationGroups({ pendingSummary }: AdminNavigationOptions): PanelSidebarGroup[] {
  return [
    {
      label: "Visão geral",
      items: [
        { title: "Dashboard global", path: "/admin", icon: LayoutDashboard, exact: true },
        {
          title: "Fila de pendências", path: "/admin/pendencias", icon: AlertOctagon,
          badgeCount: pendingSummary?.totalUrgentTasks, badgeTone: "destructive",
        },
      ],
    },
    {
      label: "Credenciamento & Contas",
      items: [
        {
          title: "Abertura de contas", path: "/admin/abertura-de-contas", icon: FileCheck2,
          badgeCount: pendingSummary?.pendingApplicationsCount, badgeTone: "primary",
        },
        { title: "Empresas", path: "/admin/empresas", icon: Building2 },
        { title: "Usuários credenciados", path: "/admin/usuarios", icon: Users2 },
      ],
    },
    {
      label: "Operações globais",
      items: [
        {
          title: "Movimentações", path: "/admin/operacoes", icon: ArrowDownUp,
          aliases: ["/admin/cobrancas", "/admin/extrato"],
        },
        { title: "Lotes de saída", path: "/admin/lotes", icon: Layers },
        {
          title: "Aprovações de saque", path: "/admin/aprovacoes-financeiras", icon: ShieldAlert,
          badgeCount: pendingSummary?.pendingFinancialApprovalsCount, badgeTone: "destructive",
        },
      ],
    },
    {
      label: "Tesouraria & Conciliação",
      items: [
        {
          title: "Carteiras", path: "/admin/saldos", icon: WalletCards,
          aliases: ["/admin/contas", "/admin/contas-bolsao", "/admin/regras-de-aprovacao"],
        },
        { title: "Relatórios e fechamentos", path: "/admin/relatorios", icon: FileSpreadsheet },
      ],
    },
    {
      label: "Políticas & Integrações",
      items: [
        { title: "Taxas e limites", path: "/admin/taxas-e-limites", icon: Sliders },
        { title: "Webhooks globais", path: "/admin/webhooks", icon: Webhook },
      ],
    },
    {
      label: "Governança & Segurança",
      items: [
        { title: "Equipe administrativa", path: "/admin/equipe", icon: UserCog },
        { title: "Trilha de auditoria", path: "/admin/auditoria", icon: History },
        { title: "Preferências", path: "/admin/preferencias", icon: SlidersHorizontal },
      ],
    },
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
