"use client";

import React, { useState } from "react";
import { useDemoScenario } from "@/providers/demo-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sliders, RotateCcw, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

const scenarios = [
  { id: "NORMAL", label: "Operação Normal", desc: "Saldo R$ 148k e histórico de 6 meses" },
  { id: "PENDING_REVIEW", label: "Conta em Validação", desc: "Cadastro sob análise do compliance" },
  { id: "UNAUTHENTICATED", label: "Visitante Deslogado", desc: "Redireciona para tela de login" },
  { id: "NEW_ACCOUNT", label: "Conta Nova (Zero)", desc: "Saldo R$ 0,00 e sem transações" },
  { id: "INSUFFICIENT_FUNDS", label: "Saldo Baixo / Insuficiente", desc: "Saldo de R$ 50,00 para testar bloqueios preventivos" },
  { id: "LIMIT_REACHED", label: "Limite Diário Atingido", desc: "Teto de R$ 100k consumido para hoje (100%)" },
  { id: "READONLY", label: "Perfil Somente Leitura", desc: "Acessos de consulta sem poder de movimentação" },
  { id: "APPROVALS_PENDING", label: "Alçadas Pendentes", desc: "3 solicitações aguardando quórum de aprovação" },
  { id: "PARTIAL_BATCH", label: "Lote com Falha Parcial", desc: "Lote contendo parcelas pagas e 1 rejeitada" },
];

export function ScenarioSwitcher() {
  const { activeScenario, switchScenario, resetScenario } = useDemoScenario();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (scenarioId: string) => {
    setLoading(true);
    try {
      await switchScenario(scenarioId);
      const selected = scenarios.find((s) => s.id === scenarioId);
      toast.success(`Cenário "${selected?.label || scenarioId}" ativado na demonstração.`);
    } catch {
      toast.error("Erro ao alternar cenário.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await resetScenario();
      toast.info("Demonstração restaurada para os dados padrão.");
    } catch {
      toast.error("Erro ao restaurar demonstração.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="h-8 gap-1.5 border-border/80 bg-secondary/40 text-xs text-muted-foreground hover:text-foreground font-medium"
        >
          <Sliders className="size-3.5 text-primary" />
          <span className="hidden sm:inline">Cenários Demo:</span>
          <span className="text-foreground font-semibold">
            {scenarios.find((s) => s.id === activeScenario)?.label || "Normal"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" />
          Cenários de Demonstração
        </DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          Alterne o estado em tempo real para testar validações, telas vazias e fluxos operacionais.
        </p>
        <DropdownMenuSeparator />
        {scenarios.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className="flex items-start justify-between py-2 cursor-pointer"
          >
            <div>
              <p className="font-medium text-sm text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            {activeScenario === s.id && (
              <Check className="size-4 text-primary shrink-0 mt-0.5" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleReset}
          className="text-xs text-primary focus:text-primary cursor-pointer font-medium"
        >
          <RotateCcw className="size-3.5 mr-2" />
          Restaurar Dados Originais da Demo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
