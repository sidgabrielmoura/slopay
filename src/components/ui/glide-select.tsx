"use client";

import { forwardRef, useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from "react";
import ReactBitsGlideSelect, { type GlideOption, type ReactBitsGlideSelectProps } from "@/components/GlideSelect";
import { cn } from "@/lib/utils";
import "./glide-select-integration.css";

export type { GlideOption } from "@/components/GlideSelect";

export interface GlideSelectProps extends Omit<ReactBitsGlideSelectProps, "triggerProps" | "portal">,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onChange" | "defaultValue" | "value" | "color" | "className" | "disabled"> {
  name?: string;
  required?: boolean;
  form?: string;
}

/** React Bits JS-CSS, with the Slopay form and overlay integration. */
export const GlideSelect = forwardRef<HTMLButtonElement, GlideSelectProps>(function GlideSelect({
  options = [], value, defaultValue = "", onChange, placeholder = "Selecione uma opção",
  showTags = true, accentColor = "var(--primary)", surfaceColor = "var(--popover)",
  highlightColor = "var(--secondary)", textColor = "var(--foreground)", size = "md", radius = 10,
  menuWidth = 176, placement = "bottom", align = "left", popDuration = 180,
  glideDuration = 220, rememberPosition = true, search, disabled = false,
  ariaLabel, className, name, required, form, id, ...buttonProps
}, forwardedRef) {
  const generatedId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const nativeRef = useRef<HTMLSelectElement | null>(null);
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const items = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  const attachTrigger = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  useEffect(() => {
    const owner = nativeRef.current?.form;
    if (!owner || value !== undefined) return;
    const reset = () => setInner(defaultValue);
    owner.addEventListener("reset", reset);
    return () => owner.removeEventListener("reset", reset);
  }, [value, defaultValue, name, required, form]);

  function change(next: string, option: GlideOption) {
    if (disabled || option.disabled) return;
    if (value === undefined) setInner(next);
    onChange?.(next, option);
  }

  return (
    <>
      <ReactBitsGlideSelect
        options={items} value={current} onChange={change} placeholder={placeholder}
        showTags={showTags} accentColor={accentColor} surfaceColor={surfaceColor}
        highlightColor={highlightColor} textColor={textColor} size={size} radius={radius}
        menuWidth={menuWidth} placement={placement} align={align} popDuration={popDuration}
        glideDuration={glideDuration} rememberPosition={rememberPosition} search={search} disabled={disabled}
        ariaLabel={buttonProps["aria-label"] ?? ariaLabel ?? (id || buttonProps["aria-labelledby"] ? null : typeof placeholder === "string" ? placeholder : "Selecionar opção")}
        className={cn("slopay-glide-select", className)} portal
        triggerProps={{ ...buttonProps, id: id ?? generatedId, ref: attachTrigger,
          "aria-required": required || undefined, "data-slot": "select-trigger" } as ReactBitsGlideSelectProps["triggerProps"]}
      />
      {(name || required) && (
        <select
          ref={nativeRef} className="glide-select__form-control" aria-hidden="true" tabIndex={-1}
          name={name} form={form} value={current} required={required} disabled={disabled}
          onChange={(event) => {
            const option = items.find((item) => item.value === event.target.value);
            if (option) change(option.value, option);
          }}
          onInvalid={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}
          onFocus={() => triggerRef.current?.focus()}
        >
          <option value="" />
          {items.filter((item) => item.value !== "").map((item) => (
            <option key={item.value} value={item.value} disabled={item.disabled}>
              {item.textValue ?? (typeof item.label === "string" ? item.label : item.value)}
            </option>
          ))}
        </select>
      )}
    </>
  );
});

export default GlideSelect;
