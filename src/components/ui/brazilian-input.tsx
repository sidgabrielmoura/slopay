"use client";

import { forwardRef, useState, type ChangeEvent } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { formatBrazilianInput, type BrazilianInputMask } from "@/lib/validators";

type BrazilianInputProps = Omit<InputProps, "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  mask?: BrazilianInputMask;
};

const inputModes = {
  CPF: "numeric",
  CNPJ: "text",
  CNPJ_NUMERIC: "numeric",
  PHONE: "tel",
  CPF_OR_CNPJ: "text",
} as const;

const maskCharacters = {
  CPF: /\d/,
  CNPJ: /[A-Z0-9]/i,
  CNPJ_NUMERIC: /\d/,
  PHONE: /[\d+]/,
  CPF_OR_CNPJ: /[A-Z0-9]/i,
};

function caretAfterCharacters(value: string, count: number, character: RegExp) {
  let index = 0;
  while (count > 0 && index < value.length) {
    if (character.test(value[index])) count--;
    index++;
  }
  return index;
}

export const BrazilianInput = forwardRef<HTMLInputElement, BrazilianInputProps>(
  ({ mask, value, defaultValue, onChange, maxLength, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(defaultValue ?? "");
    if (!mask) return <Input {...props} ref={ref} value={value} defaultValue={defaultValue} onChange={onChange} maxLength={maxLength} />;

    const activeMask = mask;
    const current = value ?? localValue;
    const displayed = formatBrazilianInput(activeMask, current) ?? current;

    function change(event: ChangeEvent<HTMLInputElement>) {
      const input = event.currentTarget;
      const raw = input.value;
      const caret = input.selectionStart ?? raw.length;
      const formatted = formatBrazilianInput(activeMask, raw);

      if (formatted !== raw) {
        const next = formatted ?? displayed;
        const character = maskCharacters[activeMask];
        let count = Array.from(raw.slice(0, caret)).filter((part) => character.test(part)).length;
        const addedPrefix = next.startsWith("+") && !raw.trimStart().startsWith("+");
        if (addedPrefix && count > 0) count++;
        let nextCaret = caretAfterCharacters(next, count, character);

        // If Delete removed only a separator, move past it so the next edit reaches the next digit.
        if (next === displayed && raw.length < next.length && (event.nativeEvent as InputEvent).inputType === "deleteContentForward") {
          if (addedPrefix && nextCaret === 0) nextCaret++;
          while (nextCaret < next.length && !character.test(next[nextCaret])) nextCaret++;
        }

        input.value = next;
        input.setSelectionRange(nextCaret, nextCaret);
      }

      if (formatted !== null && formatted !== displayed) {
        if (value === undefined) setLocalValue(formatted);
        onChange?.(event);
      }
    }

    return (
      <Input
        {...props}
        ref={ref}
        type={mask === "PHONE" ? "tel" : "text"}
        inputMode={inputModes[mask]}
        autoCapitalize={inputModes[mask] === "text" ? "characters" : undefined}
        spellCheck={false}
        value={displayed}
        onChange={change}
      />
    );
  },
);
BrazilianInput.displayName = "BrazilianInput";
