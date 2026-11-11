"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { formatCentsToBrl, parseBrlInputToCents } from "@/lib/money";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  valueInCents?: number;
  onValueChange?: (cents: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ valueInCents = 0, onValueChange, className, disabled, ...props }, ref) => {
    const formattedValue = formatCentsToBrl(valueInCents);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cents = parseBrlInputToCents(raw);
      if (onValueChange) {
        onValueChange(cents);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formattedValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-lg font-semibold text-foreground tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
