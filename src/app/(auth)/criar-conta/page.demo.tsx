"use client";

import React, { Suspense } from "react";
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { AuthLoadingStatus } from "@/features/auth/components/auth-form-controls";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function CriarContaPage() {
  return (
    <Suspense
      fallback={
        <AuthShell contentMaxWidthClass="max-w-[600px]">
          <AuthLoadingStatus className="min-h-96 justify-center">Carregando cadastro…</AuthLoadingStatus>
        </AuthShell>
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
