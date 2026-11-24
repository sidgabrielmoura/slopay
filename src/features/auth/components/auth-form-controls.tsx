import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { LoadingConfirmation, LoadingIndicator } from "@/components/ui/loading-indicator";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { cn } from "@/lib/utils";
import styles from "./auth-shell.module.css";

export function AuthHeading({ className, ...props }: ComponentProps<"h1">) {
  return <h1 {...props} className={cn("text-[26px] leading-tight font-semibold tracking-tight lg:text-3xl", className)} />;
}

type AuthFieldProps = ComponentProps<typeof BrazilianInput> & {
  id: string;
  label: string;
  error?: string | null;
  endControl?: ReactNode;
};

export function AuthField({
  id,
  name = id,
  label,
  error,
  endControl,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: AuthFieldProps) {
  const errorId = error ? id + "-error" : undefined;
  const description = [describedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="relative">
        <BrazilianInput
          {...props}
          id={id}
          name={name}
          aria-describedby={description}
          aria-invalid={error ? true : invalid}
          className={cn(
            "h-11 text-base sm:text-sm aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
            endControl && "pr-12",
            className,
          )}
        />
        {endControl}
      </div>
      {error && <span id={errorId} className="sr-only">{error}</span>}
    </div>
  );
}

export function AuthLoadingStatus({ children, className, id }: { children: string; className?: string; id?: string }) {
  return (
    <p id={id} role="status" className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <LoadingIndicator />
      {children}
    </p>
  );
}

type AuthActionButtonProps = Omit<ButtonProps, "asChild" | "children"> & {
  children: string;
  pending: boolean;
  pendingLabel: string;
  endIcon?: ReactNode;
};

export function AuthActionButton({
  children,
  pending,
  pendingLabel,
  endIcon,
  type = "submit",
  disabled,
  className,
  ...props
}: AuthActionButtonProps) {
  return (
    <Button
      {...props}
      type={type}
      disabled={pending || disabled}
      aria-label={pending ? pendingLabel : children}
      data-pending={pending}
      className={cn("h-11", styles.actionButton, className)}
    >
      <AuthActionLabels pending={pending} pendingLabel={pendingLabel} endIcon={endIcon}>
        {children}
      </AuthActionLabels>
    </Button>
  );
}

export function AuthActionLabels({ children, pending, pendingLabel, endIcon }: Pick<
  AuthActionButtonProps, "children" | "pending" | "pendingLabel" | "endIcon"
>) {
  return (
    <span className={styles.actionLabels} data-pending={pending} aria-hidden="true">
      <span className={styles.actionLabel}>{children}{endIcon}</span>
      <span className={styles.pendingLabel}>
        <LoadingIndicator active={pending} />
        {pendingLabel}
      </span>
    </span>
  );
}

export function PasswordRequirements({ id, requirements, className }: {
  id: string;
  requirements: readonly { label: string; met: boolean }[];
  className?: string;
}) {
  return (
    <ul id={id} className={cn("grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs", className)}>
      {requirements.map(({ label, met }) => (
        <li key={label} className={styles.requirement} data-met={met}>
          <span className={styles.requirementIcon} aria-hidden="true">
            <Check className={styles.requirementCheck} />
          </span>
          <span>
            {label}
            <span className="sr-only">{met ? " (atendido)" : " (pendente)"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AuthSuccessMark() {
  return <LoadingConfirmation size={44} animate />;
}
