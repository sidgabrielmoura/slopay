"use client";

import React from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import {
  LayoutDashboard,
  AlertOctagon,
  FileCheck2,
  Building2,
  ArrowDownUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDevelopmentRoute } from "@/config/development-routes";
import { useDevelopmentFeatures } from "@/providers/app-providers";

export function AdminBottomNav() {
  const pathname = usePathname();
  const development = useDevelopmentFeatures();

  const items = [
    { title: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { title: "Pendências", path: "/admin/pendencias", icon: AlertOctagon },
    { title: "Abertura", path: "/admin/abertura-de-contas", icon: FileCheck2 },
    { title: "Empresas", path: "/admin/empresas", icon: Building2 },
    { title: "Operações", path: "/admin/operacoes", icon: ArrowDownUp },
  ];

  return (
    <nav aria-label="Navegação administrativa" style={{ height: "calc(4rem + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center justify-around px-2">
      {items.filter(({ path }) => development || !isDevelopmentRoute(path)).map((item) => {
        const isActive =
          pathname === item.path ||
          (item.path !== "/admin" && pathname.startsWith(item.path));
        const Icon = item.icon;

        return (
          <NextLink
            key={item.path}
            href={item.path}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span className="truncate">{item.title}</span>
          </NextLink>
        );
      })}
    </nav>
  );
}
