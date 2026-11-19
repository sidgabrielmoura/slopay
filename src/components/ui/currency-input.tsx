"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { formatCentsToBrl, parseBrlInputToCents } from "@/lib/money";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "inputMode" | "onChange" | "type" | "value"> {
  valueInCents?: number;
  maxInCents?: number;
  onValueChange?: (cents: number) => void;
}

function caretFromRight(value: string, digitsToRight: number, deletingBackward: boolean): number {
  const firstDigit = value.search(/\d/);
  let caret = value.length;
  while (caret > firstDigit && digitsToRight > 0) {
    caret -= 1;
    if (/\d/.test(value[caret])) digitsToRight -= 1;
  }
  if (deletingBackward && /[.,]/.test(value[caret - 1])) caret -= 1;
  return caret;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ valueInCents = 0, maxInCents = Number.MAX_SAFE_INTEGER, onValueChange, className, onPaste, ...props }, ref) => {
    const formattedValue = formatCentsToBrl(valueInCents);

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(event);
      if (event.defaultPrevented) return;

      const text = event.clipboardData.getData("text/plain").trim();
      if (/^\d+$/.test(text)) return;
      event.preventDefault();

      const match = /^(R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(text);
      if (!match) return;
      const [, , reais, centavos = ""] = match;
      const cents = parseBrlInputToCents(reais + centavos.padEnd(2, "0"));
      if (!Number.isSafeInteger(cents) || cents > maxInCents) return;

      const input = event.currentTarget;
      input.value = formatCentsToBrl(cents);
      input.setSelectionRange(input.value.length, input.value.length);
      if (cents !== valueInCents) onValueChange?.(cents);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const raw = input.value;
      const digitsToRight = raw.slice(input.selectionStart ?? raw.length).replace(/\D/g, "").length;
      const cents = parseBrlInputToCents(raw);
      const valid = /^(?:R\$\s*)?[\d.,\s]*$/.test(raw) && Number.isSafeInteger(cents) && cents <= maxInCents;
      const nextValue = valid ? formatCentsToBrl(cents) : formattedValue;

      // Restore the mask and caret even when the edit leaves the amount unchanged.
      input.value = nextValue;
      const deletingBackward = (event.nativeEvent as InputEvent).inputType === "deleteContentBackward";
      const caret = caretFromRight(nextValue, digitsToRight, deletingBackward);
      input.setSelectionRange(caret, caret);
      if (valid && cents !== valueInCents) onValueChange?.(cents);
    };

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete={props.autoComplete ?? "off"}
        value={formattedValue}
        onChange={handleChange}
        onPaste={handlePaste}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-card/60 px-3 py-2 text-lg font-semibold text-foreground tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
