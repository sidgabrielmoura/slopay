"use client";

import React, { useState, useEffect, useTransition } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { toast } from "sonner";
import { useGatewayService } from "@/providers/demo-provider";
import {
  OnboardingStepper,
  OnboardingStepKey,
  ONBOARDING_STEPS,
} from "./onboarding-stepper";
import { StepResponsible } from "./steps/step-responsible";
import { StepCompany } from "./steps/step-company";
import { StepAccess } from "./steps/step-access";
import { StepReview } from "./steps/step-review";
import {
  FullOnboardingFormData,
  step1Schema,
  step2Schema,
  stepAccessSchema,
  stepReviewSchema,
  validateStepWithSchema,
} from "../schemas/onboarding.schema";

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const service = useGatewayService();
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lê a etapa atual da query string ou define 'responsavel' por padrão
  const stepParam = (searchParams.get("etapa") as OnboardingStepKey) || "responsavel";
  const validStepKeys: OnboardingStepKey[] = [
    "responsavel",
    "empresa",
    "acesso",
    "revisao",
  ];
  const currentStep: OnboardingStepKey = validStepKeys.includes(stepParam)
    ? stepParam
    : "responsavel";

  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.key === currentStep);
  const [highestVisitedStepIndex, setHighestVisitedStepIndex] = useState(
    Math.max(0, currentStepIndex)
  );

  useEffect(() => {
    if (currentStepIndex > highestVisitedStepIndex) {
      setHighestVisitedStepIndex(currentStepIndex);
    }
  }, [currentStepIndex, highestVisitedStepIndex]);

  // Instância do formulário com campos vazios para entrada real dos dados
  const form = useForm<FullOnboardingFormData>({
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      cpf: "",
      email: "",
      phone: "",
      roleInCompany: "SOCIO",
      roleOther: "",

      cnpj: "",
      businessSegment: "" as any,
      companySize: "" as any,
      website: "",

      accessEmail: "",
      password: "",
      confirmPassword: "",

      declarationAccepted: false,
    },
  });

  const goToStep = (stepKey: OnboardingStepKey) => {
    startTransition(() => {
      router.push(`/criar-conta?etapa=${stepKey}`, { scroll: true });
    });
  };

  // Proteção contra acesso direto via URL a etapas posteriores sem preenchimento prévio
  useEffect(() => {
    const data = form.getValues();
    if (currentStep === "empresa" || currentStep === "acesso" || currentStep === "revisao") {
      const s1 = step1Schema.safeParse(data);
      if (!s1.success) {
        goToStep("responsavel");
        return;
      }
    }
    if (currentStep === "acesso" || currentStep === "revisao") {
      const s2 = step2Schema.safeParse(data);
      if (!s2.success) {
        goToStep("empresa");
        return;
      }
    }
    if (currentStep === "revisao") {
      const s3 = stepAccessSchema.safeParse(data);
      if (!s3.success) {
        goToStep("acesso");
        return;
      }
    }
  }, [currentStep]);

  // Validação do Passo 1 (Responsável)
  const handleNextStep1 = () => {
    const data = form.getValues();
    const isValid = validateStepWithSchema(
      step1Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cpf", "fullName", "email", "phone", "roleInCompany", "roleOther"]
    );
    if (isValid) {
      goToStep("empresa");
    } else {
      toast.error("Por favor, preencha todos os campos obrigatórios do responsável.");
    }
  };

  // Validação do Passo 2 (Empresa)
  const handleNextStep2 = () => {
    const data = form.getValues();
    const isValid = validateStepWithSchema(
      step2Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cnpj", "businessSegment", "companySize", "website"]
    );
    if (isValid) {
      goToStep("acesso");
    } else {
      toast.error("Por favor, preencha todos os campos obrigatórios da empresa.");
    }
  };

  // Validação do Passo 3 (Acesso)
  const handleNextStep3 = () => {
    const data = form.getValues();
    const isValid = validateStepWithSchema(
      stepAccessSchema,
      data,
      form.setError,
      form.clearErrors,
      ["accessEmail", "password", "confirmPassword"]
    );
    if (isValid) {
      goToStep("revisao");
    } else {
      toast.error("A senha deve atender a todos os requisitos de segurança.");
    }
  };

  // Submissão no Passo 4 (Revisão)
  const handleSubmitOnboarding = async () => {
    const data = form.getValues();

    // 1. Valida Passo 1
    const isStep1Valid = validateStepWithSchema(
      step1Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cpf", "fullName", "email", "phone", "roleInCompany", "roleOther"]
    );
    if (!isStep1Valid) {
      toast.error("Dados do responsável incompletos. Redirecionando para preenchimento...");
      goToStep("responsavel");
      return;
    }

    // 2. Valida Passo 2
    const isStep2Valid = validateStepWithSchema(
      step2Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cnpj", "businessSegment", "companySize", "website"]
    );
    if (!isStep2Valid) {
      toast.error("Dados da empresa incompletos. Redirecionando para preenchimento...");
      goToStep("empresa");
      return;
    }

    // 3. Valida Passo 3
    const isStep3Valid = validateStepWithSchema(
      stepAccessSchema,
      data,
      form.setError,
      form.clearErrors,
      ["accessEmail", "password", "confirmPassword"]
    );
    if (!isStep3Valid) {
      toast.error("Credenciais de acesso incompletas. Redirecionando para preenchimento...");
      goToStep("acesso");
      return;
    }

    // 4. Valida Passo 4 (Declaração)
    const isStep4Valid = validateStepWithSchema(
      stepReviewSchema,
      data,
      form.setError,
      form.clearErrors,
      ["declarationAccepted"]
    );
    if (!isStep4Valid) {
      toast.error("Você deve declarar a veracidade das informações para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await service.submitOnboarding(data as any);
      if (response.success) {
        toast.success("Cadastro submetido com sucesso para análise!");
        router.push("/conta-em-validacao");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao submeter cadastro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell contentMaxWidthClass="max-w-[600px]">
      <div className="w-full space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-end gap-1 border-b border-border/40 pb-3">
          <div className="text-[11px] text-muted-foreground">
            <span>Já possui conta? </span>
            <NextLink
              href="/entrar"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
            >
              Acessar
            </NextLink>
          </div>
        </div>

        {/* Stepper Navigation */}
        <OnboardingStepper
          currentStep={currentStep}
          highestVisitedStepIndex={highestVisitedStepIndex}
          onStepClick={goToStep}
        />

        {/* Step Form Container */}
        <div className="rounded-[10px] bg-card/30 border border-border/70 p-5 sm:p-6 shadow-sm">
          {currentStep === "responsavel" && (
            <StepResponsible form={form} onNext={handleNextStep1} />
          )}

          {currentStep === "empresa" && (
            <StepCompany
              form={form}
              onNext={handleNextStep2}
              onPrev={() => goToStep("responsavel")}
            />
          )}

          {currentStep === "acesso" && (
            <StepAccess
              form={form}
              onNext={handleNextStep3}
              onPrev={() => goToStep("empresa")}
              onJumpToStep={goToStep as any}
            />
          )}

          {currentStep === "revisao" && (
            <StepReview
              form={form}
              isSubmitting={isSubmitting}
              onPrev={() => goToStep("acesso")}
              onJumpToStep={goToStep as any}
              onSubmit={handleSubmitOnboarding}
            />
          )}
        </div>
      </div>
    </AuthShell>
  );
}
