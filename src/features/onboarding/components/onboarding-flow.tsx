"use client";

import React, { useState, useEffect, useTransition } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { AuthHeading } from "@/features/auth/components/auth-form-controls";
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

const onboardingSteps = ONBOARDING_STEPS.map(({ title }) => title);

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
    const validationError = validateStepWithSchema(
      step1Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cpf", "fullName", "email", "phone", "roleInCompany", "roleOther"]
    );
    if (validationError) {
      toast.error(validationError, { id: "onboarding-validation" });
      return;
    }
    goToStep("empresa");
  };

  // Validação do Passo 2 (Empresa)
  const handleNextStep2 = () => {
    const data = form.getValues();
    const validationError = validateStepWithSchema(
      step2Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cnpj", "businessSegment", "companySize", "website"]
    );
    if (validationError) {
      toast.error(validationError, { id: "onboarding-validation" });
      return;
    }
    goToStep("acesso");
  };

  // Validação do Passo 3 (Acesso)
  const handleNextStep3 = () => {
    const data = form.getValues();
    const validationError = validateStepWithSchema(
      stepAccessSchema,
      data,
      form.setError,
      form.clearErrors,
      ["accessEmail", "password", "confirmPassword"]
    );
    if (validationError) {
      toast.error(validationError, { id: "onboarding-validation" });
      return;
    }
    goToStep("revisao");
  };

  // Submissão no Passo 4 (Revisão)
  const handleSubmitOnboarding = async () => {
    const data = form.getValues();

    // 1. Valida Passo 1
    const step1Error = validateStepWithSchema(
      step1Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cpf", "fullName", "email", "phone", "roleInCompany", "roleOther"]
    );
    if (step1Error) {
      toast.error(step1Error, { id: "onboarding-validation" });
      goToStep("responsavel");
      return;
    }

    // 2. Valida Passo 2
    const step2Error = validateStepWithSchema(
      step2Schema,
      data,
      form.setError,
      form.clearErrors,
      ["cnpj", "businessSegment", "companySize", "website"]
    );
    if (step2Error) {
      toast.error(step2Error, { id: "onboarding-validation" });
      goToStep("empresa");
      return;
    }

    // 3. Valida Passo 3
    const step3Error = validateStepWithSchema(
      stepAccessSchema,
      data,
      form.setError,
      form.clearErrors,
      ["accessEmail", "password", "confirmPassword"]
    );
    if (step3Error) {
      toast.error(step3Error, { id: "onboarding-validation" });
      goToStep("acesso");
      return;
    }

    // 4. Valida Passo 4 (Declaração)
    const step4Error = validateStepWithSchema(
      stepReviewSchema,
      data,
      form.setError,
      form.clearErrors,
      ["declarationAccepted"]
    );
    if (step4Error) {
      toast.error(step4Error, { id: "onboarding-validation" });
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
    <AuthShell
      contentMaxWidthClass="max-w-[600px]"
      step={currentStepIndex}
      progress={{ steps: onboardingSteps, current: currentStepIndex, showOnMobile: false }}
    >
      <div className="w-full space-y-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-3">
          <AuthHeading>Criar conta</AuthHeading>
          <div className="text-sm text-muted-foreground">
            <span>Já possui conta? </span>
            <NextLink
              href="/entrar"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
            >
              Acessar
            </NextLink>
          </div>
        </header>

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
