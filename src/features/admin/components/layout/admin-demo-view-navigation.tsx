"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPanelSidebarItemActive } from "@/components/layout/panel-sidebar";
import { cn } from "@/lib/utils";

const viewGroups = [
  {
    label: "Visão das movimentações",
    views: [
      { title: "Todas", path: "/admin/operacoes" },
      { title: "Cobranças", path: "/admin/cobrancas" },
      { title: "Extrato", path: "/admin/extrato" },
    ],
  },
  {
    label: "Gestão de carteiras",
    views: [
      { title: "Saldos e posições", path: "/admin/saldos" },
      { title: "Vínculos", path: "/admin/contas" },
      { title: "Validação de saques", path: "/admin/regras-de-aprovacao" },
    ],
  },
];

export function AdminDemoViewNavigation() {
  const pathname = usePathname();
  const group = viewGroups.find(({ views }) => views.some(view => isPanelSidebarItemActive(pathname, view)));
  if (!group) return null;

  return (
    <nav aria-label={group.label} className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
      {group.views.map(view => {
        const active = isPanelSidebarItemActive(pathname, view);
        return <Link key={view.path} href={view.path} prefetch={false} aria-current={active ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
            active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{view.title}</Link>;
      })}
    </nav>
  );
}
