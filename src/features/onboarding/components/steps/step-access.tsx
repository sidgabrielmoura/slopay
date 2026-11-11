"use client";

import React, { useState, useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import {
  FullOnboardingFormData,
  stepAccessSchema,
  validateStepWithSchema,
} from "../../schemas/onboarding.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, AlertTriangle, ShieldCheck } from "lucide-react";
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        met: !strength.warnings.some((w) => w.includes("CPF") || w.includes("nome") || w.includes("e-mail")),
      },
    ];
  }, [password, strength.warnings]);

  const handleAdvance = () => {
    const data = form.getValues();
    const isValid = validateStepWithSchema(
      stepAccessSchema,
      data,
      setError,
      clearErrors,
      ["accessEmail", "password", "confirmPassword"]
    );

    if (!isValid) {
      toast.error("Preencha as credenciais de acesso corretamente.");
      return;
    }

    if (!strength.isAcceptable) {
      const warningMsg =
        strength.warnings[0] ||
        "A senha informada não atinge o nível de segurança e entropia exigido.";
      setError("password", { type: "manual", message: warningMsg });
      toast.error(warningMsg);
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Credenciais de Acesso ao Console
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Defina o e-mail corporativo e a senha mestre com alto padrão criptográfico.
        </p>
      </div>

      <div className="space-y-4">
        {/* E-mail de Acesso Corporativo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="accessEmail" className="text-xs font-medium text-foreground">
              E-mail de Acesso Corporativo *
            </label>
            {responsibleEmail && accessEmail !== responsibleEmail && (
              <button
                type="button"
                onClick={() => setValue("accessEmail", responsibleEmail, { shouldValidate: true })}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Usar e-mail do responsável ({responsibleEmail})
              </button>
            )}
          </div>
          <Input
            id="accessEmail"
            type="email"
            {...register("accessEmail", {
              onChange: () => {
                if (errors.accessEmail) clearErrors("accessEmail");
              },
            })}
            placeholder="acesso@empresa.com.br"
            className={`h-10 text-xs bg-background/50 ${errors.accessEmail ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            aria-invalid={Boolean(errors.accessEmail)}
          />
          <p className="text-[10px] text-muted-foreground">
            Será a chave primária de login para autenticação no painel da SloPay.
          </p>
          {errors.accessEmail && (
            <p className="text-[11px] text-destructive">{errors.accessEmail.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Senha */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-foreground">
              Senha de Acesso (mínimo 12 caracteres) *
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  onChange: () => {
                    if (errors.password) clearErrors("password");
                  },
                })}
                placeholder="••••••••••••"
                className={`pr-10 h-10 text-xs font-mono bg-background/50 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
              Confirmar Senha de Acesso *
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword", {
                  onChange: () => {
                    if (errors.confirmPassword) clearErrors("confirmPassword");
                  },
                })}
                placeholder="••••••••••••"
                className={`pr-10 h-10 text-xs font-mono bg-background/50 ${errors.confirmPassword
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
                  }`}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Exibir senha"}
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
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
              className={cn("h-full transition-all duration-300", strength.barColorClass)}
              style={{ width: `${strength.score}%` }}
            />
          </div>

          {/* Avisos de Vulnerabilidade ou Inconsistência */}
          {strength.warnings.length > 0 && (
            <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-[11px] text-destructive space-y-1">
              {strength.warnings.map((warn, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Requisitos de Segurança */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-3.5 rounded-full items-center justify-center text-[9px]",
                    req.met
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {req.met ? <Check className="size-2.5 stroke-[3]" /> : "·"}
                </span>
                <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="h-10 px-4 text-xs gap-2"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar para Empresa</span>
        </Button>

        <Button
          type="button"
          onClick={handleAdvance}
          className="h-10 px-6 font-medium gap-2"
        >
          <span>Avançar para Revisão</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
