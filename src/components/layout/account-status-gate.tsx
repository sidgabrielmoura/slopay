"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { sessionService } from "@/services/session.service";
import { useDemoScenario } from "@/providers/demo-provider";
import { Loader2 } from "lucide-react";

export function AccountStatusGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeScenario } = useDemoScenario();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Se o cenário ativo for explicitamente não autenticado
    if (activeScenario === "UNAUTHENTICATED") {
      router.replace("/entrar");
      return;
    }

    const session = sessionService.getSession();

    if (!session) {
      // Primeira visita direta à demonstração: inicializa como conta demo aprovada
      sessionService.setSession({
        userId: "usr_1",
        name: "Gabriel Silva",
        email: "gabriel.silva@slopay.com.br",
        accountStatus: "APPROVED",
        companyName: "SloPay Enterprise Ltda",
      });
      setIsChecked(true);
      return;
    }

    // Se a conta está sob validação cadastral pendente
    if (session.accountStatus === "PENDING_REVIEW") {
      router.replace("/conta-em-validacao");
      return;
    }

    // Conta aprovada
    setIsChecked(true);
  }, [router, pathname, activeScenario]);

  if (!isChecked) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs font-mono">Verificando credenciais e status da conta...</span>
      </div>
    );
  }

  return <>{children}</>;
}
