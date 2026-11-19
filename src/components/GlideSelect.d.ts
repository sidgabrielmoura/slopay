import type { ButtonHTMLAttributes, ComponentType, ReactNode, Ref } from "react";

export interface GlideOption {
  value: string;
  label: ReactNode;
  tag?: ReactNode;
  textValue?: string;
  disabled?: boolean;
}

export interface ReactBitsGlideSelectProps {
  options?: readonly (string | GlideOption)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: GlideOption) => void;
  placeholder?: ReactNode;
  showTags?: boolean;
  accentColor?: string;
  surfaceColor?: string;
  highlightColor?: string;
  textColor?: string;
  size?: "sm" | "md" | "lg";
  radius?: number;
  menuWidth?: number;
  placement?: "bottom" | "top";
  align?: "left" | "right";
  popDuration?: number;
  glideDuration?: number;
  rememberPosition?: boolean;
  disabled?: boolean;
  ariaLabel?: string | null;
  className?: string;
  portal?: boolean;
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> };
}

declare const GlideSelect: ComponentType<ReactBitsGlideSelectProps>;
export default GlideSelect;
