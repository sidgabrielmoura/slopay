"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  expenseCategories, expenseCategoryPresentation, expenseCategorySchema,
  type ExpenseCategory, type ExpenseCategoryFilter,
} from "../expenses";

export function ExpenseCategoryLabel({ category }: { category: ExpenseCategoryFilter }) {
  const { label, color } = expenseCategoryPresentation[category];
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function ExpenseCategorySelect({ id, label, value, onChange, disabled, className }: {
  id?: string;
  label?: string;
  value: ExpenseCategory | null;
  onChange: (category: ExpenseCategory | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value={value ?? "UNCATEGORIZED"} disabled={disabled} onValueChange={(next) => {
      if (next === "UNCATEGORIZED") onChange(null);
      else {
        const category = expenseCategorySchema.safeParse(next);
        if (category.success) onChange(category.data);
      }
    }}>
      <SelectTrigger id={id} aria-label={label} className={cn("h-11 w-full min-w-0", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="UNCATEGORIZED" textValue={expenseCategoryPresentation.UNCATEGORIZED.label}><ExpenseCategoryLabel category="UNCATEGORIZED" /></SelectItem>
          {expenseCategories.map((category) => (
            <SelectItem key={category} value={category} textValue={expenseCategoryPresentation[category].label}><ExpenseCategoryLabel category={category} /></SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
