"use client";

import React from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  ArrowRight,
  QrCode,
  ShieldCheck,
  Percent,
} from "lucide-react";

export function PixHubScreen() {
  const service = useGatewayService();
  const { hideValues } = usePreferences();

  const { data: chargesData } = useQuery({
    queryKey: queryKeys.charges(),
    queryFn: () => service.getCharges({ pageSize: 5 }),
  });

  const { data: metrics } = useQuery({
    queryKey: queryKeys.overview("today"),
    queryFn: () => service.getOverviewMetrics("today"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Hub Operacional Pix
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acesse rapidamente todos os serviços de recebimento, envio e liquidação Pix.
        </p>
      </div>

      {/* 3 Ações Centrais do Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border bg-card/80 hover:border-primary/50 transition-all group flex flex-col justify-between">
          <CardHeader>
            <div className="size-12 rounded-xl bg-[var(--success-surface)] text-[var(--success)] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="size-6" />
            </div>
            <CardTitle className="text-lg font-semibold">Receber com Pix</CardTitle>
            <CardDescription className="text-xs">
              Gere cobranças dinâmicas com QR Code e código Copia e Cola com liquidação direta.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild className="w-full gap-2">
              <NextLink href="/pix/receber">
                <span>Criar Cobrança</span>
                <ArrowRight className="size-4" />
              </NextLink>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 hover:border-primary/50 transition-all group flex flex-col justify-between">
          <CardHeader>
            <div className="size-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ArrowUpRight className="size-6" />
            </div>
            <CardTitle className="text-lg font-semibold">Saque Direto</CardTitle>
            <CardDescription className="text-xs">
              Transfira valores para qualquer chave Pix de destino com verificação de PIN e regras de aprovação.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="secondary" className="w-full gap-2">
              <NextLink href="/pix/saque-direto">
                <span>Novo Saque Direto</span>
                <ArrowRight className="size-4" />
              </NextLink>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 hover:border-primary/50 transition-all group flex flex-col justify-between">
          <CardHeader>
            <div className="size-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Layers className="size-6" />
            </div>
            <CardTitle className="text-lg font-semibold">Saques em Lote</CardTitle>
            <CardDescription className="text-xs">
              Particione grandes montantes corporativos (a partir de R$ 30k) em parcelas unitárias de até R$ 15k.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="secondary" className="w-full gap-2">
              <NextLink href="/pix/saques-em-lote">
                <span>Gerenciar Lotes</span>
                <ArrowRight className="size-4" />
              </NextLink>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Rápido de Cobranças Recentes */}
      <Card className="border-border bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Cobranças Pix Recentes
            </CardTitle>
            <CardDescription className="text-xs">
              Últimos QR Codes gerados e seus status atuais
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
            <NextLink href="/movimentacoes/recebimentos">Ver Todos os Recebimentos</NextLink>
          </Button>
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-border/60">
            {chargesData?.data.map((c) => (
              <div
                key={c.id}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 px-2 rounded-lg transition-colors cursor-pointer"
                onClick={() => (window.location.href = `/pix/cobrancas/${c.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                    <QrCode className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {c.payerName || "Cobrança sem pagador informado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.id} • {formatDateTime(c.createdAt, "short")}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCentsToBrl(c.amountInCents, { hideValue: hideValues })}
                  </p>
                  <Badge
                    variant={
                      c.status === "PAID"
                        ? "success"
                        : c.status === "EXPIRED"
                        ? "destructive"
                        : "warning"
                    }
                    className="text-[10px] mt-0.5"
                  >
                    {c.status === "PAID"
                      ? "Paga"
                      : c.status === "EXPIRED"
                      ? "Expirada"
                      : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
