import * as React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Empty({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyProps) {
  return (
    <div
      className={cn(
        "flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground mb-4">
        {icon || <Inbox className="size-6" />}
      </div>
      <h4 className="text-base font-semibold text-foreground">{title}</h4>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
