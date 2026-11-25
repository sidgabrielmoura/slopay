import {
  ArrowDownLeft, ArrowUpRight, BarChart3, ChartPie, CheckCircle2, GitBranch,
  Layers, LayoutDashboard, Percent, ReceiptText, ShieldCheck, User, Users2,
} from "lucide-react";
import { financialControlPath } from "@/features/expenses/expenses";
import { integrationsItem } from "@/features/integrations/navigation";
import { approvalRulesPath } from "@/features/approval-rules/approval-rules";

export const panelNavigation = [
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
      { title: "Aprovações", path: "/aprovacoes", icon: CheckCircle2 },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Controle financeiro", path: financialControlPath, icon: ChartPie },
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
      { title: "Regras de aprovação", path: approvalRulesPath, icon: GitBranch },
      integrationsItem,
    ],
  },
];

const ownerPaths = new Set([financialControlPath, "/conta/taxas-e-limites", approvalRulesPath, "/integracoes"]);

export function merchantNavigation(member = false, demo = false) {
  return panelNavigation.map(({ label, items }) => ({
    label: member && label === "Conta & Integrações" ? "Conta" : label,
    items: items.filter(({ path }) =>
      (demo || path !== approvalRulesPath) &&
      (!member || (!path.startsWith("/pix") && path !== "/aprovacoes" && !ownerPaths.has(path)))),
  })).filter(({ items }) => items.length > 0);
}
