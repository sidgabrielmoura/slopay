import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SecurityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-5">
      <header className="space-y-1">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Segurança</h1>
        <p className="text-pretty text-sm text-muted-foreground">Gerencie a autenticação e o acesso à sua conta.</p>
      </header>
      {children}
    </div>
  );
}

export function SecurityCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="p-5 pb-3 sm:px-6 sm:pt-6">
        <h2 className="text-balance text-lg font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</CardContent>
    </Card>
  );
}

export function SecurityMethod({ icon: Icon, title, description, status, action }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  status?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-4 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-balance text-sm font-medium">{title}</h3>
            {status}
          </div>
          {description && <p className="text-pretty text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="pl-13 sm:shrink-0 sm:pl-0">{action}</div>}
    </div>
  );
}
