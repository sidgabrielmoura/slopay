"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingStepKey =
  | "responsavel"
  | "empresa"
  | "acesso"
  | "revisao";

export interface StepConfig {
  key: OnboardingStepKey;
  stepNumber: number;
  title: string;
}

export const ONBOARDING_STEPS: StepConfig[] = [
  { key: "responsavel", stepNumber: 1, title: "Responsável" },
  { key: "empresa", stepNumber: 2, title: "Empresa" },
  { key: "acesso", stepNumber: 3, title: "Acesso" },
  { key: "revisao", stepNumber: 4, title: "Revisão" },
];

interface OnboardingStepperProps {
  currentStep: OnboardingStepKey;
  highestVisitedStepIndex: number;
  onStepClick: (stepKey: OnboardingStepKey) => void;
}

export function OnboardingStepper({
  currentStep,
  highestVisitedStepIndex,
  onStepClick,
}: OnboardingStepperProps) {
  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.key === currentStep);
  const activeStep = ONBOARDING_STEPS[currentStepIndex] || ONBOARDING_STEPS[0];
  const progressPercent = Math.round(((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100);

  return (
    <nav
      aria-label="Etapas de cadastro empresarial"
      className="w-full bg-card/40 border border-border rounded-[8px] p-3 sm:p-3.5"
    >
      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 rounded-full bg-secondary text-foreground text-xs font-semibold items-center justify-center border border-border">
              {activeStep.stepNumber}
            </span>
            <span className="text-sm font-medium text-foreground">
              {activeStep.title}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {activeStep.stepNumber} de {ONBOARDING_STEPS.length}
          </span>
        </div>

        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-1 text-[11px] pt-1">
          {ONBOARDING_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isClickable = idx <= highestVisitedStepIndex;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={cn(
                  "flex-1 py-1 rounded text-center transition-colors font-medium truncate px-1",
                  isCurrent && "bg-secondary text-foreground font-semibold",
                  isCompleted && "text-muted-foreground hover:text-foreground cursor-pointer",
                  !isClickable && "text-muted-foreground/40 cursor-not-allowed"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {step.stepNumber}. {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Stepper */}
      <ol role="list" className="hidden md:flex items-center justify-between w-full">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable = index <= highestVisitedStepIndex;

          return (
            <li
              key={step.key}
              className={cn(
                "relative flex items-center",
                index === ONBOARDING_STEPS.length - 1 ? "flex-none" : "flex-1"
              )}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 sm:gap-2.5 text-left transition-opacity group",
                  !isClickable && "cursor-not-allowed opacity-40",
                  isClickable && !isCurrent && "hover:opacity-80 cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 sm:size-7 rounded-full items-center justify-center text-[11px] sm:text-xs font-medium border transition-colors shrink-0",
                    isCurrent &&
                      "bg-primary text-primary-foreground border-primary font-semibold",
                    isCompleted &&
                      "bg-secondary text-foreground border-border",
                    !isCurrent &&
                      !isCompleted &&
                      "bg-transparent text-muted-foreground border-border/70"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3 stroke-[2.5]" />
                  ) : (
                    step.stepNumber
                  )}
                </span>

                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Passo {step.stepNumber}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] sm:text-xs transition-colors",
                      isCurrent
                        ? "font-semibold text-foreground"
                        : isCompleted
                        ? "font-medium text-foreground/90"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              </button>

              {/* Connecting Line */}
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-[1px] mx-2 sm:mx-2.5 transition-colors",
                    index < currentStepIndex ? "bg-primary/40" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
