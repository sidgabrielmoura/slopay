"use client";

import { HelpCircle, Settings } from "lucide-react";
import { brandConfig } from "@/config/brand.config";
import { financialControlPath } from "@/features/expenses/expenses";
import { receiptsPath } from "@/features/receipts/pix-receipt-share";
import { useDevelopmentFeatures } from "@/providers/app-providers";
import { merchantNavigation, panelNavigation } from "./panel-navigation";
import { PanelSidebar } from "./panel-sidebar";

const footerLinks = [
  { title: "Ajuda", path: "/ajuda", icon: HelpCircle },
  { title: "Ajustes", path: "/preferencias", icon: Settings },
];

export function Sidebar({ pendingApprovals = 0, restricted = false, demo = false, member = false }: {
  pendingApprovals?: number;
  restricted?: boolean;
  demo?: boolean;
  member?: boolean;
}) {
  const development = useDevelopmentFeatures();
  const groups = restricted
    ? [{ ...panelNavigation[0], items: panelNavigation[0].items.slice(0, 1) }]
    : merchantNavigation(development, member).map(({ label, items }) => ({
      label,
      items: items
        .filter(({ path }) => !demo || (path !== financialControlPath && path !== receiptsPath))
        .map((item) => item.path === "/aprovacoes" ? { ...item, badgeCount: pendingApprovals } : item),
    }));

  return <PanelSidebar
    groups={groups}
    homePath="/inicio"
    homeLabel={"Início do " + brandConfig.name}
    subtitle="Operações Pix"
    navigationLabel="Menu do painel"
    footerLinks={restricted ? undefined : footerLinks}
    showIntegrations={development && !restricted && !member}
  />;
}
