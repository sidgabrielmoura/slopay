"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FullOnboardingFormData,
  step1Schema,
  validateStepWithSchema,
} from "../../schemas/onboarding.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2, Check, AlertCircle } from "lucide-react";
import { formatCPF, formatPhone, isValidCPF, cleanDocument } from "@/lib/validators";
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
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "loading" | "verified_manual" | "success" | "error"
  >("idle");
  const [inconsistencyMessage, setInconsistencyMessage] = useState<string | null>(null);
  const [lastSearchedCpf, setLastSearchedCpf] = useState<string>("");

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue("cpf", formatted, { shouldValidate: true });
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
        setError("cpf", {
          type: "manual",
          message: "CPF inválido. Verifique os dígitos verificadores informados.",
        });
        setSearchStatus("error");
        return;
      }

      clearErrors("cpf");

      if (clean !== lastSearchedCpf) {
        setIsSearching(true);
        setSearchStatus("loading");
        try {
          const result: PersonLookupResponse = await lookupPersonByCpf(clean);
          setLastSearchedCpf(clean);

          if (result.inconsistencyAlert) {
            setInconsistencyMessage(result.inconsistencyAlert);
            setSearchStatus("error");
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
          setSearchStatus("error");
          setLastSearchedCpf(clean);
          setError("cpf", {
            type: "manual",
            message: err.message || "Erro ao consultar CPF.",
          });
        } finally {
          setIsSearching(false);
        }
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue("phone", formatted, { shouldValidate: true });
    if (errors.phone) clearErrors("phone");
  };

  const handleAdvance = () => {
    if (inconsistencyMessage) {
      toast.error("Corrija o impedimento cadastral do CPF antes de avançar.");
      return;
    }

    const data = form.getValues();
    const isValid = validateStepWithSchema(
      step1Schema,
      data,
      setError,
      clearErrors,
      ["cpf", "fullName", "phone", "email", "roleInCompany", "roleOther"]
    );

    if (!isValid) {
      toast.error("Preencha todos os campos obrigatórios corretamente antes de prosseguir.");
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Dados do Responsável Legal
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Informe o CPF do titular para validação cadastral e credenciamento oficial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPF no Topo com Consulta Real e Loader */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor="cpf" className="text-xs font-medium text-foreground">
              CPF do Responsável *
            </label>
            {isSearching && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin text-primary" />
                Validando documento na Receita Federal...
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="cpf"
              {...register("cpf")}
              value={cpfValue}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`h-10 text-xs font-mono bg-background/50 pr-9 ${errors.cpf ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              aria-invalid={Boolean(errors.cpf)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isSearching && (searchStatus === "success" || searchStatus === "verified_manual") && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                <Check className="size-4 stroke-[2.5]" />
              </div>
            )}
            {!isSearching && searchStatus === "error" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                <AlertCircle className="size-4" />
              </div>
            )}
          </div>

          {errors.cpf && (
            <p className="text-[11px] text-destructive">{errors.cpf.message}</p>
          )}

          {!errors.cpf && searchStatus === "success" && (
            <p className="text-[11px] text-primary flex items-center gap-1.5 mt-1">
              <Check className="size-3" />
              <span>Titular validado com sucesso na Receita Federal.</span>
            </p>
          )}

          {!errors.cpf && searchStatus === "verified_manual" && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
              <Check className="size-3 text-primary" />
              <span>Preencha seus dados de identificação abaixo.</span>
            </p>
          )}

          {inconsistencyMessage && (
            <p className="text-[11px] text-destructive flex items-center gap-1.5 mt-1">
              <AlertCircle className="size-3" />
              <span>{inconsistencyMessage}</span>
            </p>
          )}
        </div>

        {/* Nome Completo */}
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="fullName" className="text-xs font-medium text-foreground">
            Nome Completo do Responsável *
          </label>
          <Input
            id="fullName"
            {...register("fullName", {
              onChange: () => {
                if (errors.fullName) clearErrors("fullName");
              },
            })}
            placeholder="Nome e sobrenome completos"
            className={`h-10 text-xs bg-background/50 ${errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && (
            <p className="text-[11px] text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        {/* Telefone / Celular */}
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-medium text-foreground">
            Celular / WhatsApp *
          </label>
          <Input
            id="phone"
            {...register("phone")}
            value={phoneValue}
            onChange={handlePhoneChange}
            placeholder="(11) 99999-9999"
            maxLength={15}
            className={`h-10 text-xs font-mono bg-background/50 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && (
            <p className="text-[11px] text-destructive">{errors.phone.message}</p>
          )}
        </div>

        {/* E-mail Corporativo */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-foreground">
            E-mail Corporativo do Responsável *
          </label>
          <Input
            id="email"
            type="email"
            {...register("email", {
              onChange: () => {
                if (errors.email) clearErrors("email");
              },
            })}
            placeholder="nome@empresa.com.br"
            className={`h-10 text-xs bg-background/50 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <p className="text-[11px] text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Vínculo com a Empresa */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-medium text-foreground">
            Vínculo / Cargo na Empresa *
          </label>
          <Select
            value={roleInCompany}
            onValueChange={(val: any) => {
              setValue("roleInCompany", val, { shouldValidate: true });
              if (errors.roleInCompany) clearErrors("roleInCompany");
            }}
          >
            <SelectTrigger
              className={`h-10 text-xs bg-background/50 ${errors.roleInCompany ? "border-destructive" : ""
                }`}
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
            <p className="text-[11px] text-destructive">{errors.roleInCompany.message}</p>
          )}
        </div>

        {/* Campo Condicional se Vínculo for "OUTRO" */}
        {roleInCompany === "OUTRO" && (
          <div className="space-y-1.5 md:col-span-2 animate-in fade-in-50">
            <label htmlFor="roleOther" className="text-xs font-medium text-foreground">
              Especifique seu cargo ou vínculo societário *
            </label>
            <Input
              id="roleOther"
              {...register("roleOther", {
                onChange: () => {
                  if (errors.roleOther) clearErrors("roleOther");
                },
              })}
              placeholder="Ex: Gerente Financeiro ou Tesoureiro Geral"
              className={`h-10 text-xs bg-background/50 ${errors.roleOther ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
            />
            {errors.roleOther && (
              <p className="text-[11px] text-destructive">{errors.roleOther.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-end pt-4 border-t border-border">
        <Button
          type="button"
          onClick={handleAdvance}
          className="h-10 px-6 font-medium gap-2"
        >
          <span>Avançar para Dados da Empresa</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
