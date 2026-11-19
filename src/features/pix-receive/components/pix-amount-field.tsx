"use client";

import { useState, useSyncExternalStore, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberPopIn } from "@/components/ui/value-motion";
import { formatCentsToBrl } from "@/lib/money";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";
import { MAX_PIX_AMOUNT_IN_CENTS } from "../pix-receipt";
import styles from "./dashboard-pix-receive.module.css";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const quickAmounts = [1000, 2500, 5000, 10000] as const;
const motionPreference = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(listener: () => void) {
  const query = window.matchMedia(motionPreference);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function PixAmountField({
  id, inputRef, cents, animation, disabled, invalid, direction = "receive", showHeading = true,
  onEdit, onPreset, onAnimationEnd,
}: {
  id: string;
  inputRef: Ref<HTMLInputElement>;
  cents: number;
  animation: { from: number; sequence: number } | null;
  disabled: boolean;
  invalid: boolean;
  direction?: "receive" | "withdraw";
  showHeading?: boolean;
  onEdit: (cents: number) => void;
  onPreset: (cents: number) => void;
  onAnimationEnd: () => void;
}) {
  const { preferencesReady, hideValues, reduceMotion } = usePreferences();
  const [editing, setEditing] = useState(false);
  const reduceSystemMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(motionPreference).matches,
    () => true,
  );
  const animate = !editing && preferencesReady && !hideValues && !reduceMotion && !reduceSystemMotion
    ? animation
    : null;
  const formatted = formatCentsToBrl(cents);
  const withdraw = direction === "withdraw";
  const Icon = withdraw ? ArrowUpRight : ArrowDownLeft;

  return (
    <>
      <div className="space-y-1 text-center">
        {showHeading && (
          <>
            <span className={cn(
              "mb-2 grid size-10 place-items-center mx-auto rounded-full",
              withdraw ? "bg-primary/20 text-primary" : "bg-success-surface text-success",
            )}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="text-sm font-semibold">{withdraw ? "Sacar Pix" : "Receber Pix"}</span>
          </>
        )}
        <div className={styles.amount} data-wide={formatted.length > 10}>
          <CurrencyInput
            ref={inputRef}
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? id + "-error" : undefined}
            valueInCents={cents}
            maxInCents={MAX_PIX_AMOUNT_IN_CENTS}
            disabled={disabled}
            onFocus={() => {
              setEditing(true);
              onAnimationEnd();
            }}
            onBlur={() => setEditing(false)}
            onValueChange={onEdit}
            data-animating={Boolean(animate)}
            className={cn(
              styles.amountInput,
              "h-auto min-h-20 rounded-none bg-transparent p-0 text-[length:inherit] leading-[inherit] font-bold tracking-[inherit] disabled:cursor-default disabled:opacity-100",
            )}
          />
          {animate && (
            <span key={animate.sequence} className={styles.amountDisplay}>
              <NumberPopIn from={formatCentsToBrl(animate.from)} to={formatted} onEnd={onAnimationEnd} />
            </span>
          )}
        </div>
        <label htmlFor={id} className="block text-sm text-muted-foreground">
          {withdraw ? "Valor a sacar (R$)" : "Valor a receber (R$)"}
        </label>
      </div>

      <div role="group" aria-label="Valores rápidos" className="grid grid-cols-4 gap-2">
        {quickAmounts.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={cents === amount ? "secondary" : "outline"}
            aria-pressed={cents === amount}
            disabled={disabled}
            onClick={() => onPreset(amount)}
            className="h-11 min-w-0 px-1 text-xs tabular-nums sm:text-sm"
          >
            R$ {amount / 100}
          </Button>
        ))}
      </div>
    </>
  );
}
