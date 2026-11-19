"use client";

import React, { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FullOnboardingFormData,
  step1Schema,
  validateStepWithSchema,
} from "../../schemas/onboarding.schema";
import { Button } from "@/components/ui/button";
import { AuthField, AuthLoadingStatus } from "@/features/auth/components/auth-form-controls";
import { ToastNotice } from "@/components/ui/toast-notice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { isValidCPF, cleanDocument } from "@/lib/validators";
import { lookupPersonByCpf, PersonLookupResponse } from "@/services/lookup.service";
import { toast } from "sonner";

interface StepResponsibleProps {
  form: UseFormReturn<FullOnboardingFormData>;
  onNext: () => void;
}

export function StepResponsible({ form, onNext }: StepResponsibleProps) {
  const {
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  const roleInCompany = watch("roleInCompany");
  const cpfValue = watch("cpf") || "";
  const phoneValue = watch("phone") || "";

  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "verified_manual" | "success">("idle");
  const [inconsistencyMessage, setInconsistencyMessage] = useState<string | null>(null);
  const [lastSearchedCpf, setLastSearchedCpf] = useState<string>("");
  const lookupSequence = useRef(0);

  useEffect(() => () => { lookupSequence.current += 1; }, []);

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const lookupId = ++lookupSequence.current;
    const formatted = e.target.value;
    setValue("cpf", formatted);
    setIsSearching(false);
    if (errors.cpf) clearErrors("cpf");

    const clean = cleanDocument(formatted);

    // Se o usuário alterar ou limpar o CPF
    if (clean !== lastSearchedCpf) {
      setSearchStatus("idle");
      setInconsistencyMessage(null);
    }

    // Dispara a validação e consulta assim que atinge 11 dígitos
    if (clean.length === 11) {
      if (!isValidCPF(clean)) {
        const message = "CPF inválido. Verifique os dígitos verificadores informados.";
        setError("cpf", {
          type: "manual",
          message,
        });
        toast.error(message, { id: "onboarding-validation" });
        return;
      }

      clearErrors("cpf");

      if (clean !== lastSearchedCpf) {
        setIsSearching(true);
        try {
          const result: PersonLookupResponse = await lookupPersonByCpf(clean);
          if (lookupSequence.current !== lookupId) return;

          setLastSearchedCpf(clean);

          if (result.inconsistencyAlert) {
            setInconsistencyMessage(result.inconsistencyAlert);
            setError("cpf", {
              type: "manual",
              message: result.inconsistencyAlert,
            });
            return;
          }

          if (result.hasExternalProvider && result.fullName) {
            setValue("fullName", result.fullName, { shouldValidate: true });
            setSearchStatus("success");
            toast.success("Dados cadastrais do titular localizados na Receita Federal.");
          } else {
            setSearchStatus("verified_manual");
          }
        } catch (err: any) {
          if (lookupSequence.current !== lookupId) return;

          setLastSearchedCpf(clean);
          const message = err.message || "Erro ao consultar CPF.";
          setError("cpf", {
            type: "manual",
            message,
          });
          toast.error(message, { id: "onboarding-validation" });
        } finally {
          if (lookupSequence.current === lookupId) setIsSearching(false);
        }
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("phone", e.target.value, { shouldValidate: true });
    if (errors.phone) clearErrors("phone");
  };

  const handleAdvance = () => {
    if (isSearching) return;

    if (inconsistencyMessage) {
      toast.error("Corrija o impedimento cadastral do CPF antes de avançar.");
      return;
    }

    const data = form.getValues();
    const validationError = validateStepWithSchema(
      step1Schema,
      data,
      setError,
      clearErrors,
      ["cpf", "fullName", "phone", "email", "roleInCompany", "roleOther"]
    );

    if (validationError) {
      toast.error(validationError, { id: "onboarding-validation" });
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Dados do Responsável Legal
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o CPF do titular para validação cadastral e credenciamento oficial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPF no Topo com Consulta Real e Loader */}
        <div className="space-y-1.5 md:col-span-2">
          <AuthField
            id="cpf"
            label="CPF do responsável"
            {...register("cpf")}
            value={cpfValue}
            onChange={handleCpfChange}
            mask="CPF"
            placeholder="000.000.000-00"
            required
            error={inconsistencyMessage ?? errors.cpf?.message}
            aria-describedby={isSearching || searchStatus === "verified_manual" ? "cpf-lookup-status" : undefined}
          />
          <ToastNotice message={inconsistencyMessage} persistent />
          {isSearching ? (
            <AuthLoadingStatus id="cpf-lookup-status" className="text-xs">Validando CPF…</AuthLoadingStatus>
          ) : searchStatus === "verified_manual" && (
            <p id="cpf-lookup-status" className="text-xs text-muted-foreground">Preencha seus dados de identificação abaixo.</p>
          )}
        </div>

        {/* Nome Completo */}
        <div className="md:col-span-2">
          <AuthField
            id="fullName"
            label="Nome completo do responsável"
            autoComplete="name"
            required
            {...register("fullName", {
              onChange: () => {
                if (errors.fullName) clearErrors("fullName");
              },
            })}
            placeholder="Nome e sobrenome completos"
            error={errors.fullName?.message}
          />
        </div>

        {/* Telefone / Celular */}
          <AuthField
            id="phone"
            label="Celular / WhatsApp"
            mask="PHONE"
            autoComplete="tel"
            required
            {...register("phone")}
            value={phoneValue}
            onChange={handlePhoneChange}
            placeholder="(11) 99999-9999"
            error={errors.phone?.message}
          />

        {/* E-mail Corporativo */}
          <AuthField
            id="email"
            label="E-mail corporativo"
            type="email"
            autoComplete="email"
            required
            {...register("email", {
              onChange: () => {
                if (errors.email) clearErrors("email");
              },
            })}
            placeholder="nome@empresa.com.br"
            error={errors.email?.message}
          />

        {/* Vínculo com a Empresa */}
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="roleInCompany" className="block text-sm font-medium">
            Vínculo / Cargo na Empresa *
          </label>
          <Select
            value={roleInCompany}
            required
            onValueChange={(value: FullOnboardingFormData["roleInCompany"]) => {
              setValue("roleInCompany", value, { shouldValidate: true });
              if (errors.roleInCompany) clearErrors("roleInCompany");
            }}
          >
            <SelectTrigger
              id="roleInCompany"
              className="h-11 w-full aria-invalid:border-destructive"
              aria-invalid={Boolean(errors.roleInCompany)}
              aria-describedby={errors.roleInCompany ? "roleInCompany-error" : undefined}
            >
              <SelectValue placeholder="Selecione seu vínculo legal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOCIO">Sócio Administrador / Proprietário</SelectItem>
              <SelectItem value="DIRETOR">Diretor Estatutário / Executivo</SelectItem>
              <SelectItem value="PROCURADOR">Procurador Legal com Instrumento Público</SelectItem>
              <SelectItem value="OUTRO">Outro (especificar)</SelectItem>
            </SelectContent>
          </Select>
          {errors.roleInCompany && (
            <span id="roleInCompany-error" className="sr-only">{errors.roleInCompany.message}</span>
          )}
        </div>

        {/* Campo Condicional se Vínculo for "OUTRO" */}
        {roleInCompany === "OUTRO" && (
          <div className="md:col-span-2">
            <AuthField
              id="roleOther"
              label="Especifique seu cargo ou vínculo societário"
              required
              {...register("roleOther", {
                onChange: () => {
                  if (errors.roleOther) clearErrors("roleOther");
                },
              })}
              placeholder="Ex: Gerente Financeiro ou Tesoureiro Geral"
              error={errors.roleOther?.message}
            />
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-end pt-4 border-t border-border">
        <Button
          type="button"
          onClick={handleAdvance}
          disabled={isSearching}
          className="h-auto min-h-11 whitespace-normal"
        >
          <span>Avançar para Dados da Empresa</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
