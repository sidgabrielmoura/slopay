"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
import {
  LayoutDashboard,
  AlertOctagon,
  FileCheck2,
  ArrowDownUp,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { adminNavigationFooter, adminNavigationGroups } from "./admin-sidebar";

const shortcuts = [
  { title: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { title: "Pendências", path: "/admin/pendencias", icon: AlertOctagon },
  { title: "Abertura", path: "/admin/abertura-de-contas", icon: FileCheck2 },
  { title: "Operações", path: "/admin/operacoes", icon: ArrowDownUp },
];
const shortcutClass = "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

export function AdminBottomNav({ live = false }: { live?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrent = (path: string) => pathname === path || (path !== "/admin" && pathname?.startsWith(`${path}/`));
  const groups = adminNavigationGroups({ live });
  const footer = adminNavigationFooter(live);
  const moreActive = menuOpen || (!shortcuts.some(({ path }) => isCurrent(path)) &&
    [...groups.flatMap(({ items }) => items), ...footer].some(({ path }) => isCurrent(path)));

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <nav aria-label="Navegação administrativa" className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {shortcuts.map(({ path, title, icon: Icon }) => (
          <NextLink
            key={path}
            href={path}
            prefetch={false}
            aria-current={isCurrent(path) ? "page" : undefined}
            className={cn(shortcutClass, isCurrent(path) ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Icon aria-hidden="true" className="size-4" />
            <span className="max-w-full truncate">{title}</span>
          </NextLink>
        ))}
        <SheetTrigger type="button" className={cn(shortcutClass, moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
          <Menu aria-hidden="true" className="size-4" />
          Mais
        </SheetTrigger>
      </nav>
      <SheetContent side="bottom" aria-describedby={undefined} className="mx-auto flex max-w-md flex-col overflow-hidden p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="shrink-0 border-b border-border pb-3 pr-8 text-left">
          <SheetTitle>Menu administrativo</SheetTitle>
        </SheetHeader>
        <nav aria-label="Seções do superadmin" className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain">
          {[...groups, { label: "Conta", items: footer }].map(({ label, items }) => (
            <div key={label} className="flex flex-col gap-1">
              <p className="px-3 text-xs font-medium text-muted-foreground">{label}</p>
              {items.map(({ path, title, icon: Icon }) => (
                <NextLink key={path} href={path} prefetch={false} onNavigate={() => setMenuOpen(false)}
                  aria-current={isCurrent(path) ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring",
                    isCurrent(path) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-foreground hover:bg-accent")}>
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <span>{title}</span>
                </NextLink>
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
