"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminSections, matchesAdminPage } from "../../admin-navigation";
import { useAdminActivity } from "../admin-activity-provider";

const demoPixPages = [
  { title: "Todas", path: "/admin/operacoes" },
  { title: "Cobranças", path: "/admin/cobrancas" },
  { title: "Extrato", path: "/admin/extrato" },
];

const demoWalletPages = [
  { title: "Saldos e posições", path: "/admin/saldos" },
  { title: "Vínculos", path: "/admin/contas" },
  { title: "Validação de saques", path: "/admin/regras-de-aprovacao" },
];

export function AdminSectionNavigation({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  const activity = useAdminActivity();
  const section = adminSections.find(item => item.pages?.some(page => matchesAdminPage(pathname, page)));
  if (!section?.pages) return null;
  const pages = demo && pathname && (
    demoPixPages.some(page => matchesAdminPage(pathname, page)) ? demoPixPages :
    demoWalletPages.some(page => matchesAdminPage(pathname, page)) ? demoWalletPages : null
  );

  return (
    <div className="grid min-w-0 gap-3">
    <nav aria-label={section.title} className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
      {section.pages.map(page => {
        const active = matchesAdminPage(pathname, page);
        const pending = page.badge ? activity?.summary?.[page.badge] ?? 0 : 0;
        return (
          <Link key={page.path} href={page.path} prefetch={false} aria-current={active ? "page" : undefined}
            className={cn("inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {page.title}
            {pending > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs tabular-nums text-primary">
              {pending > 99 ? "99+" : pending}<span className="sr-only"> pendências</span>
            </span>}
          </Link>
        );
      })}
    </nav>
    {pages && <nav aria-label={section.id === "pix" ? "Visão das movimentações" : "Gestão de carteiras"}
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
      {pages.map(page => {
        const active = matchesAdminPage(pathname, page);
        return <Link key={page.path} href={page.path} prefetch={false} aria-current={active ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
            active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{page.title}</Link>;
      })}
    </nav>}
    </div>
  );
}
