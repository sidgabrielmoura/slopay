import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import "./checkbox.css";

type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "children">;

export function CheckboxIndicator({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("t-check pointer-events-none inline-grid size-4 shrink-0 place-items-center rounded-sm", className)}>
      <svg width="10" height="10" viewBox="0 0 10.1668 10.1668" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d="M1 5.52L3.92 9.17L9.17 1" />
        <line x1="2" y1="5.0834" x2="8.1668" y2="5.0834" />
      </svg>
    </span>
  );
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...props }, ref) {
  return (
    <span className={cn("relative inline-grid size-4 shrink-0 align-middle", className)}>
      <input {...props} ref={ref} type="checkbox" data-slot="checkbox"
        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
      <CheckboxIndicator className="size-full" />
    </span>
  );
});
