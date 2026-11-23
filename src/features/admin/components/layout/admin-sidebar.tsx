"use client";

import {
  LayoutDashboard,
  AlertOctagon,
  FileCheck2,
  Building2,
  Wallet,
  WalletCards,
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
  ExternalLink,
  Shield,
} from "lucide-react";
import { PanelSidebar, type PanelSidebarGroup } from "@/components/layout/panel-sidebar";

type AdminNavigationOptions = {
  pendingSummary?: { pendingApplicationsCount?: number; pendingFinancialApprovalsCount?: number; totalUrgentTasks?: number };
  live?: boolean;
};

export function adminNavigationGroups({ pendingSummary, live = false }: AdminNavigationOptions): PanelSidebarGroup[] {
  const pendingAppsCount = pendingSummary?.pendingApplicationsCount ?? 0;
  const pendingApprovalsCount = pendingSummary?.pendingFinancialApprovalsCount ?? 0;
  const totalUrgent = pendingSummary?.totalUrgentTasks ?? 0;

  return [
    {
      label: "Visão Geral",
      items: [
        { title: "Dashboard Global", path: "/admin", icon: LayoutDashboard, exact: true },
        {
          title: "Fila de Pendências",
          path: "/admin/pendencias",
          icon: AlertOctagon,
          badgeCount: totalUrgent,
          badgeTone: "destructive",
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
          badgeTone: "primary",
        },
        { title: "Empresas", path: "/admin/empresas", icon: Building2 },
        { title: "Contas Operacionais", path: "/admin/contas", icon: Wallet },
        ...(live ? [{ title: "Contas bolsão", path: "/admin/contas-bolsao", icon: WalletCards }] : []),
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
          badgeTone: "destructive",
        },
      ],
    },
    {
      label: "Tesouraria & Conciliação",
      items: [
        { title: "Extrato Global", path: "/admin/extrato", icon: BookOpenCheck },
        { title: "Saldos e Posições", path: "/admin/saldos", icon: Coins },
        { title: "Relatórios e Fechamentos", path: "/admin/relatorios", icon: FileSpreadsheet },
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
}

export function adminNavigationFooter(live: boolean) {
  return live
    ? [{ title: "Segurança da conta", path: "/conta/seguranca", icon: Shield }]
    : [{ title: "Painel do cliente", path: "/inicio", icon: ExternalLink }];
}

export function AdminSidebar({ pendingSummary, live = false }: AdminNavigationOptions) {
  return <PanelSidebar
    groups={adminNavigationGroups({ pendingSummary, live })}
    homePath="/admin"
    homeLabel="Início do superadmin"
    subtitle="Superadmin"
    navigationLabel="Menu do superadmin"
    footerLinks={adminNavigationFooter(live)}
  />;
}
