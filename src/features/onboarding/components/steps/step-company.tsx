"use client";

import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FullOnboardingFormData,
  step2Schema,
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
import { ArrowRight, ArrowLeft, Loader2, Check, AlertCircle, Building2, ShieldAlert } from "lucide-react";
import { formatCNPJ, isValidCNPJ, cleanDocument } from "@/lib/validators";
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

  React.useEffect(() => {
    register("businessSegment");
    register("companySize");
  }, [register]);

  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setValue("cnpj", formatted, { shouldValidate: true });
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
        setError("cnpj", {
          type: "manual",
          message: "CNPJ inválido. Verifique os dígitos informados.",
        });
        setSearchStatus("error");
        return;
      }

      clearErrors("cnpj");

      if (clean !== lastSearchedCnpj) {
        setIsSearching(true);
        setSearchStatus("loading");
        try {
          const res = await lookupCompanyByCnpj(clean);
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
          setSearchStatus("error");
          setLastSearchedCnpj(clean);
          setError("cnpj", {
            type: "manual",
            message: err.message || "Erro ao consultar CNPJ.",
          });
        } finally {
          setIsSearching(false);
        }
      }
    }
  };

  const handleAdvance = () => {
    if (inconsistencyError) {
      toast.error("Corrija as inconsistências cadastrais apontadas antes de avançar.");
      return;
    }

    const data = form.getValues();
    const isValid = validateStepWithSchema(
      step2Schema,
      data,
      setError,
      clearErrors,
      ["cnpj", "businessSegment", "companySize", "website"]
    );

    if (!isValid) {
      toast.error("Preencha todos os campos obrigatórios da empresa antes de prosseguir.");
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Dados da Empresa
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Informe o CNPJ para consulta oficial em tempo real na Receita Federal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CNPJ com Consulta Real e Loader */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor="cnpj" className="text-xs font-medium text-foreground">
              CNPJ da Empresa *
            </label>
            {isSearching && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin text-primary" />
                Consultando dados na Receita Federal...
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="cnpj"
              {...register("cnpj")}
              value={cnpjValue}
              onChange={handleCnpjChange}
              placeholder="00.000.000/0001-00"
              maxLength={18}
              className={`h-10 text-xs font-mono bg-background/50 pr-9 ${
                errors.cnpj ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
              aria-invalid={Boolean(errors.cnpj)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isSearching && searchStatus === "success" && !inconsistencyError && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                <Check className="size-4 stroke-[2.5]" />
              </div>
            )}
            {!isSearching && (searchStatus === "error" || inconsistencyError) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                <AlertCircle className="size-4" />
              </div>
            )}
          </div>

          {errors.cnpj && (
            <p className="text-[11px] text-destructive">{errors.cnpj.message}</p>
          )}

          {/* Card de Confirmação Cadastral Oficial da Receita Federal */}
          {searchStatus === "success" && companyData && companyData.isAtiva && (
            <div className="p-3.5 rounded-lg bg-card/60 border border-border mt-2 space-y-2">
              <div className="flex items-start justify-between gap-2">
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
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

          {inconsistencyError && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 mt-2 flex items-start gap-2.5">
              <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-[11px] text-destructive space-y-0.5">
                <p className="font-semibold">Impedimento de Credenciamento</p>
                <p>{inconsistencyError}</p>
              </div>
            </div>
          )}

          {/* Aviso de Conformidade Societária */}
          {complianceNotice && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2 flex items-start gap-2 text-[11px] text-amber-300">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{complianceNotice}</p>
            </div>
          )}
        </div>

        {/* Website / Perfil Comercial */}
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="website" className="text-xs font-medium text-foreground">
            Site Oficial ou Perfil Comercial (opcional)
          </label>
          <Input
            id="website"
            {...register("website", {
              onChange: () => {
                if (errors.website) clearErrors("website");
              },
            })}
            placeholder="https://suaempresa.com.br"
            className={`h-10 text-xs bg-background/50 ${
              errors.website ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
            aria-invalid={Boolean(errors.website)}
          />
          {errors.website && (
            <p className="text-[11px] text-destructive">{errors.website.message}</p>
          )}
        </div>

        {/* Segmento de Atuação (Preenchido automaticamente ou ajustável) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Segmento Principal *
          </label>
          <Select
            value={businessSegment || ""}
            onValueChange={(val: any) => {
              setValue("businessSegment", val, { shouldValidate: true });
              if (errors.businessSegment) clearErrors("businessSegment");
            }}
          >
            <SelectTrigger
              className={`h-10 text-xs bg-background/50 ${
                errors.businessSegment ? "border-destructive" : ""
              }`}
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
            <p className="text-[11px] text-destructive">{errors.businessSegment.message}</p>
          )}
        </div>

        {/* Porte da Empresa (Preenchido automaticamente ou ajustável) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Porte da Empresa *
          </label>
          <Select
            value={companySize || ""}
            onValueChange={(val: any) => {
              setValue("companySize", val, { shouldValidate: true });
              if (errors.companySize) clearErrors("companySize");
            }}
          >
            <SelectTrigger
              className={`h-10 text-xs bg-background/50 ${
                errors.companySize ? "border-destructive" : ""
              }`}
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
            <p className="text-[11px] text-destructive">{errors.companySize.message}</p>
          )}
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
          <span>Voltar ao Responsável</span>
        </Button>

        <Button
          type="button"
          onClick={handleAdvance}
          disabled={Boolean(inconsistencyError) || isSearching}
          className="h-10 px-6 font-medium gap-2"
        >
          <span>Avançar para Acesso</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
