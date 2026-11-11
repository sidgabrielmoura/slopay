"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime, formatTimeRemaining } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Copy,
  Check,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Share2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function ChargeDetailScreen({ chargeId }: { chargeId: string }) {
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const { hideValues } = usePreferences();
  const [copied, setCopied] = useState(false);

  const { data: charge, isLoading, isError } = useQuery({
    queryKey: queryKeys.charge(chargeId),
    queryFn: () => service.getChargeById(chargeId),
  });

  const payMutation = useMutation({
    mutationFn: () => service.simulatePayCharge(chargeId),
    onSuccess: () => {
      toast.success("Pagamento Pix simulado com sucesso! Saldo creditado.");
      queryClient.invalidateQueries({ queryKey: queryKeys.charge(chargeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.account() });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao simular pagamento.");
    },
  });

  const handleCopyCode = () => {
    if (!charge) return;
    navigator.clipboard.writeText(charge.copyPasteCode);
    setCopied(true);
    toast.success("Código Copia e Cola copiado com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in-50">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !charge) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Empty
          title="Cobrança não encontrada"
          description={`A cobrança com identificador "${chargeId}" não existe na demonstração.`}
          action={
            <Button asChild variant="outline">
              <NextLink href="/pix/receber">Gerar Nova Cobrança</NextLink>
            </Button>
          }
        />
      </div>
    );
  }

  const isPaid = charge.status === "PAID";
  const remaining = formatTimeRemaining(charge.expiresAt);
  const isExpired = !isPaid && remaining.isExpired;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Voltar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/pix/receber")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Criar Outra Cobrança</span>
        </Button>
        <Badge
          variant={isPaid ? "success" : isExpired ? "destructive" : "warning"}
          className="text-xs px-3 py-1"
        >
          {isPaid
            ? "Pagamento Confirmado"
            : isExpired
            ? "Cobrança Expirada"
            : "Aguardando Pagamento"}
        </Badge>
      </div>

      <Card className="border-border bg-card shadow-lg overflow-hidden">
        <CardHeader className="text-center pb-4 border-b border-border/60">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cobrança Pix #{charge.id}
          </CardTitle>
          <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums tracking-tight mt-1">
            {formatCentsToBrl(charge.amountInCents, { hideValue: hideValues })}
          </div>
          {charge.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {charge.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Box de QR Code com fundo claro garantido */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-muted/40 border border-border">
            {isPaid ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="size-16 rounded-full bg-[var(--success-surface)] text-[var(--success)] flex items-center justify-center">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Cobrança Liquidada com Sucesso!
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  O valor de {formatCentsToBrl(charge.netAmountInCents)} líquido já foi creditado no saldo disponível da sua conta.
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  Data: {formatDateTime(charge.paidAt || charge.createdAt, "medium")}
                </p>
              </div>
            ) : isExpired ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <div className="size-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
                  <AlertTriangle className="size-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Esta cobrança expirou
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  O tempo limite de validade desta cobrança Pix foi ultrapassado.
                </p>
                <Button asChild size="sm" className="mt-2">
                  <NextLink href="/pix/receber">Gerar Nova Cobrança</NextLink>
                </Button>
              </div>
            ) : (
              <>
                {/* Container Branco com QR Code Demonstrativo */}
                <div className="p-4 bg-white rounded-xl shadow-md border border-neutral-300">
                  <svg
                    className="size-48 sm:size-52 text-black"
                    viewBox="0 0 100 100"
                    fill="currentColor"
                  >
                    {/* Visual de QR Code vetorial limpo */}
                    <rect width="100" height="100" fill="#ffffff" />
                    {/* Marcador Superior Esquerdo */}
                    <rect x="10" y="10" width="24" height="24" fill="#000000" />
                    <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
                    <rect x="18" y="18" width="8" height="8" fill="#000000" />
                    {/* Marcador Superior Direito */}
                    <rect x="66" y="10" width="24" height="24" fill="#000000" />
                    <rect x="70" y="14" width="16" height="16" fill="#ffffff" />
                    <rect x="74" y="18" width="8" height="8" fill="#000000" />
                    {/* Marcador Inferior Esquerdo */}
                    <rect x="10" y="66" width="24" height="24" fill="#000000" />
                    <rect x="14" y="70" width="16" height="16" fill="#ffffff" />
                    <rect x="18" y="74" width="8" height="8" fill="#000000" />
                    {/* Padrões de dados fictícios */}
                    <rect x="38" y="12" width="6" height="6" fill="#000000" />
                    <rect x="48" y="18" width="8" height="6" fill="#000000" />
                    <rect x="40" y="28" width="12" height="6" fill="#000000" />
                    <rect x="12" y="42" width="8" height="8" fill="#000000" />
                    <rect x="24" y="46" width="6" height="6" fill="#000000" />
                    <rect x="36" y="40" width="20" height="20" fill="#000000" />
                    <rect x="42" y="46" width="8" height="8" fill="#ffffff" />
                    <rect x="64" y="42" width="10" height="6" fill="#000000" />
                    <rect x="78" y="44" width="8" height="8" fill="#000000" />
                    <rect x="38" y="68" width="10" height="8" fill="#000000" />
                    <rect x="52" y="72" width="8" height="6" fill="#000000" />
                    <rect x="66" y="66" width="6" height="12" fill="#000000" />
                    <rect x="76" y="70" width="12" height="6" fill="#000000" />
                    <rect x="68" y="82" width="16" height="6" fill="#000000" />
                  </svg>
                </div>
                <span className="text-[11px] text-muted-foreground mt-3 font-medium">
                  QR demonstrativo, sem pagamento real
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Clock className="size-3.5 text-warning" />
                  <span>{remaining.text}</span>
                </div>
              </>
            )}
          </div>

          {/* Código Copia e Cola */}
          {!isPaid && !isExpired && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pix Copia e Cola (Código Demonstrativo)
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={charge.copyPasteCode}
                  className="flex-1 h-10 px-3 rounded-lg border border-border bg-muted/40 font-mono text-xs text-muted-foreground truncate select-all"
                />
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="shrink-0 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-primary" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Botão Especial de Demonstração: Simular Pagamento */}
          {!isPaid && !isExpired && (
            <div className="pt-2 border-t border-border/80">
              <Button
                onClick={() => payMutation.mutate()}
                disabled={payMutation.isPending}
                className="w-full h-11 text-sm font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="size-4" />
                <span>
                  {payMutation.isPending
                    ? "Simulando Pagamento..."
                    : "Simular Pagamento Imediato Desta Cobrança"}
                </span>
              </Button>
              <p className="text-center text-[11px] text-muted-foreground mt-2">
                Ação demonstrativa: liquida a cobrança, credita o saldo e gera lançamento no extrato.
              </p>
            </div>
          )}

          {isPaid && (
            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <NextLink href="/movimentacoes/recebimentos">
                  Ver em Recebimentos
                </NextLink>
              </Button>
              <Button asChild className="flex-1">
                <NextLink href="/pix/receber">Nova Cobrança</NextLink>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
