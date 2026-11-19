import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function IntegrationHeading({ title, description, action, preview = false }: {
  title: string; description: string; action?: ReactNode; preview?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">{title}</h1>
          {preview && <Badge variant="outline" className="text-muted-foreground">Dados simulados</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}
