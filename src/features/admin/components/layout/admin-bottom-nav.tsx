"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { isPanelSidebarItemActive } from "@/components/layout/panel-sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { adminNavigationFooter, adminNavigationGroups } from "./admin-sidebar";

const shortcutLabels = new Map([
  ["/admin", "Dashboard"],
  ["/admin/pendencias", "Pendências"],
  ["/admin/abertura-de-contas", "Abertura"],
  ["/admin/operacoes", "Pix"],
]);
const shortcutClass = "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

export function AdminBottomNav({ live = false }: { live?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = adminNavigationGroups({});
  const footer = adminNavigationFooter(live);
  const items = groups.flatMap(group => group.items);
  const shortcuts = items.filter(item => shortcutLabels.has(item.path));
  const moreActive = menuOpen || [...items, ...footer].some(item =>
    !shortcutLabels.has(item.path) && isPanelSidebarItemActive(pathname, item));

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <nav aria-label="Navegação administrativa" className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {shortcuts.map(item => {
          const { path, title, icon: Icon } = item;
          const active = isPanelSidebarItemActive(pathname, item);
          return (
            <Link key={path} href={path} prefetch={false} aria-current={active ? "page" : undefined}
              className={cn(shortcutClass, active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Icon aria-hidden="true" className="size-4" />
              <span className="max-w-full truncate">{shortcutLabels.get(path) ?? title}</span>
            </Link>
          );
        })}
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
              {items.map(item => {
                const { path, title, icon: Icon } = item;
                const active = isPanelSidebarItemActive(pathname, item);
                return (
                  <Link key={path} href={path} prefetch={false} onNavigate={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring",
                      active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-foreground hover:bg-accent")}>
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    <span>{title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
