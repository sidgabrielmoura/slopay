import Link from "next/link";
import { cn } from "@/lib/utils";
import { transactionTabs, type TransactionTab } from "../transaction-presentation";

export function StatementNavigation({ tab, receipts = false }: { tab: TransactionTab; receipts?: boolean }) {
  return (
    <nav aria-label="Movimentações Pix" className="flex min-w-0 flex-wrap gap-x-4 border-b border-border text-sm font-medium sm:gap-x-6">
      {Object.entries(transactionTabs).map(([key, { path, label }]) => {
        if (key === "RECEIPTS" && !receipts) return null;
        const active = key === tab;
        return (
          <Link key={path} href={path} prefetch={false} aria-current={active ? "page" : undefined}
            className={cn("flex min-h-11 items-center whitespace-nowrap border-b-2 px-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              active ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
