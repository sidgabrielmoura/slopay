"use client";

import { CircleHelp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function HelpTooltip({ label, children, className }: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="iconSm" aria-label={label}
          className={cn("text-muted-foreground", className)}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}>
          <CircleHelp aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start" side="top" collisionPadding={12}
        className="max-w-[min(19rem,calc(100vw-1.5rem))] px-3 py-2 text-pretty leading-relaxed motion-reduce:animate-none">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
