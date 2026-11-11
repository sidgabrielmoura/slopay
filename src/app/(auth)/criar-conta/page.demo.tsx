"use client";

import React, { Suspense } from "react";
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Loader2 } from "lucide-react";

export default function CriarContaPage() {
  return (
    <Suspense
      fallback={
        <AuthShell contentMaxWidthClass="max-w-[540px]">
          <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs">Carregando formulário de cadastro empresarial...</p>
          </div>
        </AuthShell>
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
