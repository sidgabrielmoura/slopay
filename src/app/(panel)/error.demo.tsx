"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ToastNotice } from "@/components/ui/toast-notice";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro capturado no layout do painel:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center animate-in fade-in-50">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/20 text-destructive mb-4">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Ocorreu um erro ao carregar esta área
      </h3>
      <ToastNotice message="Houve uma falha ao carregar a visualização demonstrativa." persistent />
      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCcw className="size-4" />
          <span>Tentar novamente</span>
        </Button>
      </div>
    </div>
  );
}
