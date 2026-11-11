"use client";

import React from "react";
import NextLink from "next/link";
import { useDemoScenario } from "@/providers/demo-provider";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertOctagon,
  Eye,
  Sparkles,
  Clock,
  Layers,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

export function ScenarioBanner() {
  const { activeScenario, resetScenario } = useDemoScenario();

  if (activeScenario === "NORMAL") {
    return null;
  }

  const configs: Record<
    string,
    {
      icon: React.ComponentType<{ className?: string }>;
      title: string;
      message: string;
      btnLabel?: string;
      btnAction?: () => void;
      btnHref?: string;
      colorClass: string;
    }
  > = {
    INSUFFICIENT_FUNDS: {
      icon: AlertTriangle,
      title: "Cenário Ativo: Saldo Baixo / Insuficiente (R$ 50,00)",
      message:
        "O saldo disponível foi ajustado para R$ 50,00 para demonstrar bloqueios automáticos e validações preventivas em saques e lotes.",
      btnLabel: "Restaurar Normal",
      btnAction: resetScenario,
      colorClass: "bg-amber-500/10 border-amber-500/30 text-amber-200",
    },
    LIMIT_REACHED: {
      icon: AlertOctagon,
      title: "Cenário Ativo: Limite Diário Esgotado (100% Utilizado)",
      message:
        "O teto diário operacional do SPI (R$ 100.000,00) foi totalmente consumido hoje. Novas solicitações de saída serão rejeitadas.",
      btnLabel: "Restaurar Normal",
      btnAction: resetScenario,
      colorClass: "bg-rose-500/10 border-rose-500/30 text-rose-200",
    },
    READONLY: {
      icon: Eye,
      title: "Cenário Ativo: Perfil Somente Leitura (Consulta)",
      message:
        "Sessão simulada como Lucas Mendes (Consulta). Ações de transferência, geração de cobrança, criação de lotes e aprovação estão bloqueadas.",
      btnLabel: "Voltar para Titular",
      btnAction: resetScenario,
      colorClass: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    },
    NEW_ACCOUNT: {
      icon: Sparkles,
      title: "Cenário Ativo: Conta Nova (Saldo Zerado)",
      message:
        "Simulando uma empresa recém-aberta sem histórico de lançamentos, cobranças ou lotes.",
      btnLabel: "Carregar Dados da Demo",
      btnAction: resetScenario,
      colorClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
    },
    APPROVALS_PENDING: {
      icon: Clock,
      title: "Cenário Ativo: Alçadas Pendentes de Aprovação",
      message:
        "3 operações de alto valor aguardam aprovação do quórum de titulares (R$ 95.500,00 retidos em saldo reservado).",
      btnLabel: "Ver Fila de Aprovações",
      btnHref: "/aprovacoes",
      colorClass: "bg-purple-500/10 border-purple-500/30 text-purple-200",
    },
    PARTIAL_BATCH: {
      icon: Layers,
      title: "Cenário Ativo: Lote com Falha Parcial no SPI",
      message:
        "Um lote possui 2 parcelas concluídas e 1 com erro de comunicação DICT para teste de contingência e conciliação.",
      btnLabel: "Ver Lotes de Saque",
      btnHref: "/pix/saques-em-lote",
      colorClass: "bg-orange-500/10 border-orange-500/30 text-orange-200",
    },
  };

  const current = configs[activeScenario];
  if (!current) return null;

  const Icon = current.icon;

  return (
    <div
      className={`w-full p-3.5 sm:px-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-6 shadow-sm ${current.colorClass}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="size-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">{current.title}</p>
          <p className="opacity-90 leading-relaxed mt-0.5">{current.message}</p>
        </div>
      </div>

      <div className="shrink-0 self-end sm:self-center">
        {current.btnHref ? (
          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 font-medium">
            <NextLink href={current.btnHref}>
              <span>{current.btnLabel}</span>
              <ArrowRight className="size-3.5" />
            </NextLink>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={current.btnAction}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <RotateCcw className="size-3" />
            <span>{current.btnLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
