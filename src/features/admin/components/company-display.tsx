import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CompanyAccessStatus } from "../admin-companies";
import { companyStatusLabels } from "../admin-companies";

const variants = { ACTIVE: "success", SUSPENDED: "destructive", LOCKED: "warning", PENDING_VERIFICATION: "secondary" } as const;

export function CompanyAccessBadge({ status }: { status: CompanyAccessStatus }) {
  return <Badge variant={variants[status]}>{companyStatusLabels[status]}</Badge>;
}

export function CompanyField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 wrap-anywhere text-sm">{children}</dd>
    </div>
  );
}

export function CompanyRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border">
      <Skeleton className="h-14 animate-none rounded-none" />
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-16 animate-none rounded-none" />)}
    </div>
  );
}

export function CompanyReadError({ title, retry }: { title: string; retry: () => void }) {
  return (
    <Card className="grid min-h-48 content-center justify-items-center gap-4 p-6 text-center">
      <h2 className="text-balance text-lg font-semibold">{title}</h2>
      <Button variant="outline" type="button" className="h-11" onClick={retry}>Tentar novamente</Button>
    </Card>
  );
}
