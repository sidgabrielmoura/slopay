"use client";

import React, { useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import {
  FullOnboardingFormData,
  stepAccessSchema,
  validateStepWithSchema,
} from "../../schemas/onboarding.schema";
import { AuthField, PasswordRequirements } from "@/features/auth/components/auth-form-controls";
import { AuthPasswordField } from "@/features/auth/components/auth-password-field";
import authStyles from "@/features/auth/components/auth-shell.module.css";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatePasswordStrength } from "@/lib/password-strength";
import { toast } from "sonner";

interface StepAccessProps {
  form: UseFormReturn<FullOnboardingFormData>;
  onNext: () => void;
  onPrev: () => void;
  onJumpToStep?: (stepKey: "responsavel") => void;
}

export function StepAccess({ form, onNext, onPrev }: StepAccessProps) {
  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";
  const responsibleEmail = useWatch({ control, name: "email" }) ?? "";
  const responsibleName = useWatch({ control, name: "fullName" }) ?? "";
  const responsibleCpf = useWatch({ control, name: "cpf" }) ?? "";
  const accessEmail = useWatch({ control, name: "accessEmail" }) ?? "";

  // Sincroniza e-mail inicial com o do responsável se ainda não foi alterado
  React.useEffect(() => {
    const current = form.getValues("accessEmail");
    if (!current && responsibleEmail) {
      setValue("accessEmail", responsibleEmail, { shouldValidate: true });
    }
  }, [responsibleEmail, setValue, form]);

  // Análise matemática de força e entropia da senha
  const strength = useMemo(() => {
    return calculatePasswordStrength(password, {
      fullName: responsibleName,
      cpf: responsibleCpf,
      email: accessEmail || responsibleEmail,
    });
  }, [password, responsibleName, responsibleCpf, accessEmail, responsibleEmail]);

  // Requisitos específicos
  const requirements = useMemo(() => {
    return [
      { label: "Mínimo de 12 caracteres", met: password.length >= 12 },
      { label: "Letra maiúscula e minúscula", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
      { label: "Pelo menos um número", met: /[0-9]/.test(password) },
      { label: "Pelo menos um caractere especial (!@#$%)", met: /[^A-Za-z0-9]/.test(password) },
      {
        label: "Sem dados pessoais (CPF, nome ou e-mail)",
        met: Boolean(password) && !strength.warnings.some((w) => w.includes("CPF") || w.includes("nome") || w.includes("e-mail")),
      },
    ];
  }, [password, strength.warnings]);

  const handleAdvance = () => {
    const data = form.getValues();
    const validationError = validateStepWithSchema(
      stepAccessSchema,
      data,
      setError,
      clearErrors,
      ["accessEmail", "password", "confirmPassword"]
    );

    if (validationError) {
      toast.error(validationError, { id: "onboarding-validation" });
      return;
    }

    if (!strength.isAcceptable) {
      const warningMsg =
        strength.warnings[0] ||
        "A senha informada não atinge o nível de segurança e entropia exigido.";
      setError("password", { type: "manual", message: warningMsg });
      toast.error(warningMsg, { id: "onboarding-validation" });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Credenciais de Acesso ao Console
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina o e-mail corporativo e a senha mestre com alto padrão criptográfico.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <AuthField
            id="accessEmail"
            label="E-mail de acesso corporativo"
            type="email"
            autoComplete="email"
            {...register("accessEmail", {
              onChange: () => {
                if (errors.accessEmail) clearErrors("accessEmail");
              },
            })}
            error={errors.accessEmail?.message}
            aria-describedby="onboarding-email-help"
            required
          />
          <p id="onboarding-email-help" className="text-xs text-muted-foreground">
            Será a chave primária de login para autenticação no painel da SloPay.
          </p>
          {responsibleEmail && accessEmail !== responsibleEmail && (
            <button
              type="button"
              onClick={() => setValue("accessEmail", responsibleEmail, { shouldValidate: true })}
              className="min-h-11 text-left text-xs text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
            >
              Usar e-mail do responsável ({responsibleEmail})
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AuthPasswordField
            id="password"
            label="Senha de acesso"
            autoComplete="new-password"
            {...register("password", {
              onChange: () => {
                if (errors.password) clearErrors("password");
              },
            })}
            error={errors.password?.message}
            aria-describedby="onboarding-password-help"
            required
          />
          <AuthPasswordField
            id="confirmPassword"
            label="Confirmar senha"
            autoComplete="new-password"
            {...register("confirmPassword", {
              onChange: () => {
                if (errors.confirmPassword) clearErrors("confirmPassword");
              },
            })}
            error={errors.confirmPassword?.message}
            required
          />
        </div>

        {/* Medidor Matemático de Força e Entropia da Senha */}
        <div className="p-3.5 rounded-lg bg-card/40 border border-border space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Força calculada:</span>
              <span className={cn("font-semibold", strength.colorClass)}>
                {strength.label}
              </span>
            </div>
            <span className="text-muted-foreground text-[11px] font-mono">
              {strength.entropyBits > 0 ? `${strength.entropyBits} bits de entropia` : "0 bits"}
            </span>
          </div>

          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className={cn("h-full w-full origin-left", authStyles.strengthBar, strength.barColorClass)}
              style={{ transform: `scaleX(${strength.score / 100})` }}
            />
          </div>

          <PasswordRequirements
            id="onboarding-password-help"
            requirements={requirements}
            className="grid-cols-1 pt-1 sm:grid-cols-2"
          />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="h-11"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar para Empresa</span>
        </Button>

        <Button
          type="button"
          onClick={handleAdvance}
          className="h-11"
        >
          <span>Avançar para Revisão</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
