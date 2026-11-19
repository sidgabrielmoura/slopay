"use client";

import React, { useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FullOnboardingFormData,
  step2Schema,
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
import { ArrowRight, ArrowLeft, Building2 } from "lucide-react";
import { isValidCNPJ, cleanDocument } from "@/lib/validators";
import { lookupCompanyByCnpj, CompanyLookupResponse } from "@/services/lookup.service";
import { toast } from "sonner";

interface StepCompanyProps {
  form: UseFormReturn<FullOnboardingFormData>;
  onNext: () => void;
  onPrev: () => void;
}

export function StepCompany({ form, onNext, onPrev }: StepCompanyProps) {
  const {
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  const cnpjValue = watch("cnpj") || "";
  const businessSegment = watch("businessSegment");
  const companySize = watch("companySize");
  const responsibleCpf = watch("cpf") || "";
  const roleInCompany = watch("roleInCompany");

  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [companyData, setCompanyData] = useState<CompanyLookupResponse | null>(null);
  const [inconsistencyError, setInconsistencyError] = useState<string | null>(null);
  const [complianceNotice, setComplianceNotice] = useState<string | null>(null);
  const [lastSearchedCnpj, setLastSearchedCnpj] = useState<string>("");
  const lookupSequence = useRef(0);

  React.useEffect(() => {
    register("businessSegment");
    register("companySize");
  }, [register]);

  React.useEffect(() => () => { lookupSequence.current += 1; }, []);

  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const lookupId = ++lookupSequence.current;
    const formatted = e.target.value;
    setValue("cnpj", formatted);
    setIsSearching(false);
    if (errors.cnpj) clearErrors("cnpj");

    const clean = cleanDocument(formatted);

    // Reseta status se o usuário alterar o CNPJ
    if (clean !== lastSearchedCnpj) {
      setSearchStatus("idle");
      setInconsistencyError(null);
      setComplianceNotice(null);
    }

    // Ao completar os 14 dígitos, dispara a validação matemática e a consulta na Receita Federal
    if (clean.length === 14) {
      if (!isValidCNPJ(clean)) {
        const message = "CNPJ inválido. Verifique os dígitos informados.";
        setError("cnpj", {
          type: "manual",
          message,
        });
        toast.error(message, { id: "onboarding-validation" });
        setSearchStatus("error");
        return;
      }

      clearErrors("cnpj");

      if (clean !== lastSearchedCnpj) {
        setIsSearching(true);
        setSearchStatus("loading");
        try {
          const res = await lookupCompanyByCnpj(clean);
          if (lookupSequence.current !== lookupId) return;

          setLastSearchedCnpj(clean);
          setCompanyData(res);

          // 1. Verifica consistência da Situação Cadastral
          if (!res.isAtiva) {
            const msg = `Inconsistência cadastral: Este CNPJ consta como '${res.situacaoCadastral}' na Receita Federal. O credenciamento é restrito a empresas com situação ATIVA.`;
            setInconsistencyError(msg);
            setSearchStatus("error");
            setError("cnpj", { type: "manual", message: msg });
            return;
          }

          // 2. Preenchimento automático dos dados retornados
          setValue("legalName", res.razaoSocial, { shouldValidate: false });
          setValue("tradeName", res.nomeFantasia, { shouldValidate: false });
          setValue("businessSegment", res.mappedSegment, { shouldValidate: true });
          setValue("companySize", res.mappedSize, { shouldValidate: true });

          // 3. Verificação cruzada com o Responsável Legal (Quadro Societário - QSA)
          if (res.qsa && res.qsa.length > 0 && roleInCompany === "SOCIO") {
            const cleanResp = cleanDocument(responsibleCpf);
            // Verifica se o CPF mascarado (***123456**) bate com os dígitos centrais
            const middleDigits = cleanResp.slice(3, 9);
            const foundInQsa = res.qsa.some((partner) => {
              if (!partner.cpfMascarado) return false;
              const cleanMasked = cleanDocument(partner.cpfMascarado);
              return cleanMasked.includes(middleDigits);
            });

            if (!foundInQsa) {
              setComplianceNotice(
                "Aviso de conformidade: O CPF do responsável não foi localizado no Quadro de Sócios público da Receita Federal. Será necessária a apresentação de procuração ou aditivo contratual na etapa de validação."
              );
            } else {
              setComplianceNotice(null);
            }
          }

          setSearchStatus("success");
          toast.success("Dados da empresa consultados com sucesso na Receita Federal.");
        } catch (err: any) {
          if (lookupSequence.current !== lookupId) return;

          setSearchStatus("error");
          setLastSearchedCnpj(clean);
          const message = err.message || "Erro ao consultar CNPJ.";
          setError("cnpj", {
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

  const handleAdvance = () => {
    if (isSearching) return;

    if (inconsistencyError) {
      toast.error("Corrija as inconsistências cadastrais apontadas antes de avançar.");
      return;
    }

    const data = form.getValues();
    const validationError = validateStepWithSchema(
      step2Schema,
      data,
      setError,
      clearErrors,
      ["cnpj", "businessSegment", "companySize", "website"]
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
          Dados da Empresa
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Informe o CNPJ para consulta oficial em tempo real na Receita Federal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CNPJ com Consulta Real e Loader */}
        <div className="space-y-1.5 md:col-span-2">
          <AuthField
            id="cnpj"
            label="CNPJ da empresa"
            {...register("cnpj")}
            value={cnpjValue}
            onChange={handleCnpjChange}
            mask="CNPJ_NUMERIC"
            placeholder="00.000.000/0001-00"
            required
            error={errors.cnpj?.message}
            aria-describedby={isSearching ? "cnpj-lookup-status" : undefined}
          />
          {isSearching && (
            <AuthLoadingStatus id="cnpj-lookup-status" className="text-xs">Consultando CNPJ…</AuthLoadingStatus>
          )}

          {/* Card de Confirmação Cadastral Oficial da Receita Federal */}
          {searchStatus === "success" && companyData && companyData.isAtiva && (
            <div className="mt-2 space-y-2 rounded-lg border border-border bg-card/60 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">
                      {companyData.razaoSocial}
                    </p>
                    {companyData.nomeFantasia && (
                      <p className="text-[11px] text-muted-foreground">
                        Nome Fantasia: {companyData.nomeFantasia}
                      </p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded bg-success-surface px-2 py-0.5 text-xs font-medium text-success">
                  Ativa na Receita Federal
                </span>
              </div>

              {companyData.cnaeDescricao && (
                <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="text-foreground/70">Atividade Principal:</span> {companyData.cnaeDescricao}
                </p>
              )}
            </div>
          )}

          <ToastNotice message={inconsistencyError} persistent />
          <ToastNotice variant="warning" message={complianceNotice} persistent />
        </div>

        {/* Website / Perfil Comercial */}
        <div className="md:col-span-2">
          <AuthField
            id="website"
            label="Site oficial ou perfil comercial (opcional)"
            inputMode="url"
            autoComplete="url"
            {...register("website", {
              onChange: () => {
                if (errors.website) clearErrors("website");
              },
            })}
            placeholder="https://suaempresa.com.br"
            error={errors.website?.message}
          />
        </div>

        {/* Segmento de Atuação (Preenchido automaticamente ou ajustável) */}
        <div className="space-y-1.5">
          <label htmlFor="businessSegment" className="block text-sm font-medium">
            Segmento Principal *
          </label>
          <Select
            value={businessSegment || ""}
            required
            onValueChange={(value: FullOnboardingFormData["businessSegment"]) => {
              setValue("businessSegment", value, { shouldValidate: true });
              if (errors.businessSegment) clearErrors("businessSegment");
            }}
          >
            <SelectTrigger
              id="businessSegment"
              className="h-11 w-full aria-invalid:border-destructive"
              aria-invalid={Boolean(errors.businessSegment)}
              aria-describedby={errors.businessSegment ? "businessSegment-error" : undefined}
            >
              <SelectValue placeholder="Selecione o segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ECOMMERCE">E-commerce / Varejo Digital</SelectItem>
              <SelectItem value="SAAS">SaaS / Plataforma Tecnológica</SelectItem>
              <SelectItem value="MARKETPLACE">Marketplace / Intermediação</SelectItem>
              <SelectItem value="SERVICOS">Prestação de Serviços B2B/B2C</SelectItem>
              <SelectItem value="FINTECH">Fintech / Serviços Financeiros</SelectItem>
              <SelectItem value="OUTRO">Outro segmento</SelectItem>
            </SelectContent>
          </Select>
          {errors.businessSegment && (
            <span id="businessSegment-error" className="sr-only">{errors.businessSegment.message}</span>
          )}
        </div>

        {/* Porte da Empresa (Preenchido automaticamente ou ajustável) */}
        <div className="space-y-1.5">
          <label htmlFor="companySize" className="block text-sm font-medium">
            Porte da Empresa *
          </label>
          <Select
            value={companySize || ""}
            required
            onValueChange={(value: FullOnboardingFormData["companySize"]) => {
              setValue("companySize", value, { shouldValidate: true });
              if (errors.companySize) clearErrors("companySize");
            }}
          >
            <SelectTrigger
              id="companySize"
              className="h-11 w-full aria-invalid:border-destructive"
              aria-invalid={Boolean(errors.companySize)}
              aria-describedby={errors.companySize ? "companySize-error" : undefined}
            >
              <SelectValue placeholder="Selecione o porte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1 a 10 colaboradores</SelectItem>
              <SelectItem value="11-50">11 a 50 colaboradores</SelectItem>
              <SelectItem value="51-200">51 a 200 colaboradores</SelectItem>
              <SelectItem value="200+">Mais de 200 colaboradores</SelectItem>
            </SelectContent>
          </Select>
          {errors.companySize && (
            <span id="companySize-error" className="sr-only">{errors.companySize.message}</span>
          )}
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
          <span>Voltar ao Responsável</span>
        </Button>

        <Button
          type="button"
          onClick={handleAdvance}
          disabled={Boolean(inconsistencyError) || isSearching}
          className="h-11"
        >
          <span>Avançar para Acesso</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
