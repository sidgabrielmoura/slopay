"use client";

import { Children, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";
import { GlideSelect, type GlideOption } from "./glide-select";

// Compatibility for the existing compound API. Every visible select is rendered
// by React Bits, including demo and administrative forms.
type DescriptorProps = { children?: ReactNode };
type TriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;
type ItemProps = DescriptorProps & { value: string; disabled?: boolean; textValue?: string; className?: string };

function SelectTrigger(_props: TriggerProps) { return null; }
function SelectContent(_props: DescriptorProps & { className?: string }) { return null; }
function SelectGroup(_props: DescriptorProps) { return null; }
function SelectValue(_props: { placeholder?: ReactNode }) { return null; }
function SelectItem(_props: ItemProps) { return null; }

function textContent(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<DescriptorProps>(child) ? textContent(child.props.children) : "";
  }).join(" ").trim();
}

function Select({ children, value, defaultValue, onValueChange, disabled, required, name }: {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}) {
  const options: GlideOption[] = [];
  let trigger: TriggerProps = {};
  let placeholder: ReactNode = "Selecione uma opção";

  function read(nodes: ReactNode) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement<DescriptorProps>(child)) return;
      if (child.type === SelectItem) {
        const item = child.props as ItemProps;
        options.push({ value: item.value, label: item.children, disabled: item.disabled,
          textValue: item.textValue ?? (textContent(item.children) || item.value) });
        return;
      }
      if (child.type === SelectTrigger) trigger = child.props as TriggerProps;
      if (child.type === SelectValue) placeholder = (child.props as { placeholder?: ReactNode }).placeholder ?? placeholder;
      read(child.props.children);
    });
  }
  read(children);
  const { children: _children, className, ...triggerProps } = trigger;
  // Keep page geometry while removing the previous select's visual styles.
  const layout = className?.split(/\s+/).filter((token) =>
    /^(?:(?:sm|md|lg|xl|2xl):)?(?:w-|min-w-|max-w-|flex-|grow|shrink|basis-|col-span-|row-span-|self-|order-|m[trblxy]?-)/.test(token)).join(" ");
  const compact = className?.split(/\s+/).some((token) => /^h-(8|9)$/.test(token));

  return <GlideSelect {...triggerProps} options={options} value={value} defaultValue={defaultValue}
    onChange={(next) => onValueChange?.(next)} disabled={disabled || trigger.disabled} required={required} name={name}
    placeholder={placeholder} size={compact ? "md" : "lg"} className={layout || "w-full"} />;
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
