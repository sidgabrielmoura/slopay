"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FullOnboardingFormData } from "../../schemas/onboarding.schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ArrowRight } from "lucide-react";
import { maskCPF, maskCNPJ } from "@/lib/validators";

interface StepReviewProps {
  form: UseFormReturn<FullOnboardingFormData>;
  isSubmitting: boolean;
  onPrev: () => void;
  onJumpToStep: (stepKey: "responsavel" | "empresa" | "acesso") => void;
  onSubmit: () => void;
}

const roleLabels: Record<string, string> = {
  SOCIO: "Sócio Administrador / Proprietário",
  DIRETOR: "Diretor Estatutário / Executivo",
  PROCURADOR: "Procurador Legal com Instrumento Público",
  OUTRO: "Outro vínculo",
};

const segmentLabels: Record<string, string> = {
  ECOMMERCE: "E-commerce / Varejo Digital",
  SAAS: "SaaS / Plataforma Tecnológica",
  MARKETPLACE: "Marketplace / Intermediação",
  SERVICOS: "Prestação de Serviços B2B/B2C",
  FINTECH: "Fintech / Serviços Financeiros",
  OUTRO: "Outro segmento",
};

export function StepReview({
  form,
  isSubmitting,
  onPrev,
  onJumpToStep,
  onSubmit,
}: StepReviewProps) {
  const {
    watch,
    register,
    formState: { errors },
  } = form;

  const data = watch();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Revisão e Envio da Proposta
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Confira os dados antes de submeter para análise de compliance.
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-card/40 border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h3 className="text-xs font-semibold text-foreground">
              1. Responsável Legal
            </h3>
            <button
              type="button"
              onClick={() => onJumpToStep("responsavel")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Editar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block">Nome:</span>
              <span className="text-foreground">{data.fullName || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">CPF:</span>
              <span className="font-mono text-foreground">{maskCPF(data.cpf || "") || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Telefone:</span>
              <span className="font-mono text-foreground">{data.phone || "—"}</span>
            </div>
            <div className="truncate">
              <span className="text-[11px] text-muted-foreground block">E-mail:</span>
              <span className="text-foreground">{data.email || "—"}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[11px] text-muted-foreground block">Vínculo:</span>
              <span className="text-foreground">
                {roleLabels[data.roleInCompany] || data.roleInCompany || "—"}
                {data.roleOther ? ` (${data.roleOther})` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 2: Empresa PJ */}
        <div className="p-4 rounded-lg bg-card/40 border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h3 className="text-xs font-semibold text-foreground">
              2. Dados da Empresa
            </h3>
            <button
              type="button"
              onClick={() => onJumpToStep("empresa")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Editar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {data.legalName && (
              <div className="sm:col-span-3 pb-1 border-b border-border/40">
                <span className="text-[11px] text-muted-foreground block">Razão Social:</span>
                <span className="text-foreground font-semibold">{data.legalName}</span>
              </div>
            )}
            <div>
              <span className="text-[11px] text-muted-foreground block">CNPJ:</span>
              <span className="font-mono text-foreground">{maskCNPJ(data.cnpj || "") || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Segmento:</span>
              <span className="text-foreground">
                {segmentLabels[data.businessSegment] || data.businessSegment || "—"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Porte:</span>
              <span className="text-foreground">{data.companySize ? `${data.companySize} colaboradores` : "—"}</span>
            </div>
            {data.website && (
              <div className="sm:col-span-3">
                <span className="text-[11px] text-muted-foreground block">Website:</span>
                <span className="text-foreground font-mono text-[11px]">{data.website}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bloco 3: Credenciais de Acesso */}
        <div className="p-4 rounded-lg bg-card/40 border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h3 className="text-xs font-semibold text-foreground">
              3. Credenciais de Acesso
            </h3>
            <button
              type="button"
              onClick={() => onJumpToStep("acesso")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Editar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block">E-mail de Login:</span>
              <span className="text-foreground font-medium">{data.accessEmail || data.email || "—"}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Senha Corporativa:</span>
              <span className="font-mono text-muted-foreground">•••••••••••• (12+ caracteres)</span>
            </div>
          </div>
        </div>

        {/* Termo e Declaração de Veracidade */}
        <div className="p-3.5 rounded-lg bg-card/30 border border-border space-y-2">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="declarationAccepted"
              {...register("declarationAccepted", {
                onChange: () => {
                  if (errors.declarationAccepted) {
                    form.clearErrors("declarationAccepted");
                  }
                },
              })}
              className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
            />
            <label
              htmlFor="declarationAccepted"
              className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
            >
              Declaro sob as penas da lei que todas as informações prestadas são verdadeiras e precisas, que possuo poderes legais de representação da sociedade perante o SloPay e o Banco Central do Brasil, e autorizo a análise cadastral e de conformidade.
            </label>
          </div>
          {errors.declarationAccepted && (
            <p className="text-[11px] text-destructive pl-6">
              {errors.declarationAccepted.message}
            </p>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={isSubmitting}
          className="h-10 px-4 text-xs gap-2"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar para Acesso</span>
        </Button>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="h-10 px-6 font-medium gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Enviando Proposta...</span>
            </>
          ) : (
            <>
              <span>Submeter Cadastro para Análise</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
