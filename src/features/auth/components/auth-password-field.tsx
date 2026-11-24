"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthField } from "./auth-form-controls";

type AuthPasswordFieldProps = Omit<ComponentProps<typeof AuthField>, "type" | "endControl" | "mask">;

export function AuthPasswordField({ id, label, className, disabled, readOnly, ...props }: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const action = visible ? "Ocultar senha" : "Exibir senha";

  return (
    <AuthField
      {...props}
      id={id}
      label={label}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      disabled={disabled}
      readOnly={readOnly}
      className={cn("[&::-ms-reveal]:hidden", className)}
      endControl={(
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || readOnly}
          onClick={() => setVisible((current) => !current)}
          aria-label={label === "Senha" ? action : `${action} no campo ${label}`}
          aria-controls={id}
          className="absolute inset-y-0 right-0 size-11 text-muted-foreground focus-visible:ring-inset focus-visible:ring-offset-0"
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      )}
    />
  );
}
