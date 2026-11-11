"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { demoPolicy } from "@/config/demo-policy.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Percent, Shield, Clock, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export function TaxesAndLimitsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const service = useGatewayService();
  const { hideValues } = usePreferences();

  const tab = searchParams?.get("aba") === "limites" ? "limites" : "taxas";

  const { data: account } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
  });

  const handleTabChange = (newTab: "taxas" | "limites") => {
    router.push(`/conta/taxas-e-limites?aba=${newTab}`);
  };

  const dailyLimit = account?.dailyLimitInCents ?? demoPolicy.dailyLimitInCents;
  const usedLimit = account?.usedDailyLimitInCents ?? 0;
  const remainingLimit = Math.max(0, dailyLimit - usedLimit);
  const usedPct = Math.min(100, Math.round((usedLimit / dailyLimit) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Taxas e Limites da Conta
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulte as condições comerciais contratadas e o consumo do limite operacional diário.
        </p>
      </div>

      {/* Abas */}
      <div className="flex border-b border-border gap-6 text-sm font-medium">
        <button
          onClick={() => handleTabChange("taxas")}
          className={`pb-3 border-b-2 transition-colors ${tab === "taxas"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          Tarifas Pix Contratadas
        </button>
        <button
          onClick={() => handleTabChange("limites")}
          className={`pb-3 border-b-2 transition-colors ${tab === "limites"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          Limites Operacionais Diários
        </button>
      </div>

      {tab === "taxas" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Taxa de Recebimento */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="size-10 rounded-lg bg-[var(--success-surface)] text-[var(--success)] flex items-center justify-center mb-2">
                  <ArrowDownLeft className="size-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Recebimento Pix (Entrada)
                </CardTitle>
                <CardDescription className="text-xs">
                  Aplicada sobre o montante bruto de cobranças liquidadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {(demoPolicy.receiveFeePercentage * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (mínimo de R$ 0,15 por transação)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A tarifa é calculada como o <strong>maior valor</strong> entre o percentual aplicado em centavos e o valor mínimo de R$ 0,15. Não há cobrança cumulativa do mínimo com o percentual.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <span className="font-semibold text-foreground block">Exemplo Prático:</span>
                  <p className="text-muted-foreground">
                    Venda de R$ 100,00 $\to$ Tarifa de <strong>R$ 2,50</strong> (líquido R$ 97,50).
                  </p>
                  <p className="text-muted-foreground">
                    Venda de R$ 3,00 $\to$ Tarifa mínima de <strong>R$ 0,15</strong> (líquido R$ 2,85).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Taxa de Saída */}
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="size-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-2">
                  <ArrowUpRight className="size-5" />
                </div>
                <CardTitle className="text-base font-semibold">
                  Saque Pix (Envio / Transferência)
                </CardTitle>
                <CardDescription className="text-xs">
                  Tarifa cobrada sobre cada transferência Pix emitida
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {(demoPolicy.withdrawFeePercentage * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (mínimo de R$ 0,15 por parcela)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O valor principal transferido é enviado integralmente ao recebedor; a tarifa é debitada de forma adicional no saldo disponível da sua conta.
                </p>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                  <span className="font-semibold text-foreground block">Exemplo Prático:</span>
                  <p className="text-muted-foreground">
                    Saque de R$ 1.000,00 $\to$ Tarifa de <strong>R$ 15,00</strong> (débito total de R$ 1.015,00).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Nota de Demonstração: As tarifas exibidas são calculadas estritamente a partir de <code>demo-policy.config.ts</code> e estão em modo somente leitura para o usuário corporativo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Consumo do Limite Diário
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Renovação diária automática às 00:00 (fuso America/Sao_Paulo)
                  </CardDescription>
                </div>
                <Badge
                  variant={usedPct >= 90 ? "destructive" : usedPct >= 70 ? "warning" : "success"}
                  className="text-xs"
                >
                  {usedPct}% consumido
                </Badge>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Utilizado hoje: {formatCentsToBrl(usedLimit, { hideValue: hideValues })}</span>
                  <span>Teto diário: {formatCentsToBrl(dailyLimit, { hideValue: hideValues })}</span>
                </div>
                <Progress value={usedPct} />
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Limite Restante para Hoje
                  </span>
                  <p className="text-xl font-bold tabular-nums text-primary mt-1">
                    {formatCentsToBrl(remainingLimit, { hideValue: hideValues })}
                  </p>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Disponível para novos saques
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Limite por Transação Única
                  </span>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-1">
                    {formatCentsToBrl(account?.maxPerTransactionInCents ?? 1500000, { hideValue: hideValues })}
                  </p>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Teto por operação Pix avulsa
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-xs text-muted-foreground font-medium block">
                    Mínimo para Lotes
                  </span>
                  <p className="text-xl font-bold tabular-nums text-foreground mt-1">
                    {formatCentsToBrl(demoPolicy.batchMinAmountInCents, { hideValue: hideValues })}
                  </p>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Particionamento em até R$ 15k
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
