"use client";

import { Check } from "lucide-react";
import { stepperSpring } from "@/components/ui/stepper-motion";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

const stepLabels = ["Montar", "Revisar", "Autorizar"] as const;

export function BatchStepper({ step }: { step: 0 | 1 | 2 }) {
  const { reduceMotion } = usePreferences();
  return (
    <div className="relative isolate overflow-hidden rounded-xl border border-border bg-card p-1">
      <div aria-hidden="true" className="pointer-events-none absolute inset-1">
        <div className={cn("h-full w-1/3 rounded-lg bg-accent transition-transform duration-[560ms] motion-reduce:transition-none",
          reduceMotion && "transition-none")}
          style={{ transform: `translateX(${step * 100}%)`, transitionTimingFunction: stepperSpring }} />
      </div>
      <ol aria-label="Etapas do lote" className="relative grid grid-cols-3">
        {stepLabels.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined}
            className={cn("flex min-h-11 items-center justify-center gap-1.5 px-1 text-center text-sm font-medium",
              index === step ? "text-primary" : "text-muted-foreground")}>
            {index < step && <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" />}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
