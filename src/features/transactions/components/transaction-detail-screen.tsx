"use client";

import React from "react";
import NextLink from "next/link";
import { ToastNotice } from "@/components/ui/toast-notice";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { brandConfig } from "@/config/brand.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  ArrowLeft,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export function TransactionDetailScreen({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const service = useGatewayService();
  const { hideValues } = usePreferences();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const { data: tx, isLoading, isError } = useQuery({
    queryKey: queryKeys.transaction(transactionId),
    queryFn: () => service.getTransactionById(transactionId),
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copiado para a área de transferência.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in-50">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !tx) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Empty
          title="Transação não encontrada"
          description={`Não localizamos o identificador "${transactionId}" nesta demonstração.`}
          action={
            <Button asChild variant="outline">
              <NextLink href="/movimentacoes">Voltar ao Extrato</NextLink>
            </Button>
          }
        />
      </div>
    );
  }

  const isReceive = tx.direction === "IN";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Barra de Ações Superior (Oculta na Impressão) */}
      <div className="flex items-center justify-between no-print">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar</span>
        </Button>

        {tx.status === "COMPLETED" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="size-4" />
            <span>Imprimir Comprovante</span>
          </Button>
        )}
      </div>

      {/* Cartão Principal do Detalhe / Comprovante Imprimível */}
      <Card className="border-border bg-card shadow-md print:border-none print:shadow-none">
        {/* Cabeçalho do Comprovante */}
        <CardHeader className="border-b border-border/80 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {brandConfig.name} • Comprovante de Operação Pix
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                {isReceive ? "Recebimento Pix" : "Saque Pix"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {brandConfig.legalNotice}
              </p>
            </div>
            <Badge
              variant={
                tx.status === "COMPLETED"
                  ? "success"
                  : tx.status === "PENDING_APPROVAL"
                    ? "warning"
                    : tx.status === "PROCESSING"
                      ? "info"
                      : "destructive"
              }
              className="text-xs px-3 py-1"
            >
              {tx.status === "COMPLETED"
                ? "Liquidado com Sucesso"
                : tx.status === "PENDING_APPROVAL"
                  ? "Aguardando Aprovação"
                  : tx.status === "PROCESSING"
                    ? "Em Processamento"
                    : tx.status === "FAILED"
                      ? "Falha na Transação"
                      : "Recusado"}
            </Badge>
          </div>

          {/* Destaque do Valor */}
          <div className="pt-4">
            <span className="text-xs text-muted-foreground">Valor da Operação</span>
            <div
              className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight mt-0.5 ${
                isReceive ? "text-[var(--success)]" : "text-foreground"
                }`}
            >
              {formatCentsToBrl(tx.amountInCents, {
                hideValue: hideValues,
                showSign: isReceive,
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Dados Financeiros e Tarifas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border/60">
            <div>
              <span className="text-xs text-muted-foreground">Valor Principal</span>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {formatCentsToBrl(tx.amountInCents, { hideValue: hideValues })}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Tarifa Operacional Pix</span>
              <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                {formatCentsToBrl(tx.feeInCents, { hideValue: hideValues })}
              </p>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                {isReceive ? "Total Creditado Líquido" : "Total Debitado da Conta"}
              </span>
              <p className="text-base font-bold tabular-nums text-foreground">
                {formatCentsToBrl(tx.totalDebitedInCents, { hideValue: hideValues })}
              </p>
            </div>
          </div>

          {/* Contraparte (Favorecido ou Pagador) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isReceive ? "Dados do Pagador" : "Dados do Favorecido"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Nome</span>
                <p className="font-medium text-foreground">{tx.counterpartyName}</p>
              </div>
              {tx.counterpartyDocument && (
                <div>
                  <span className="text-xs text-muted-foreground">Documento</span>
                  <p className="font-medium text-foreground">{tx.counterpartyDocument}</p>
                </div>
              )}
              {tx.counterpartyKey && (
                <div className="sm:col-span-2 flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      Chave Pix ({tx.counterpartyKeyType || "Destino"})
                    </span>
                    <p className="font-mono text-xs text-foreground font-medium">
                      {tx.counterpartyKey}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => handleCopy(tx.counterpartyKey!, "Chave Pix")}
                    title="Copiar Chave Pix"
                    className="no-print"
                  >
                    {copiedKey === "Chave Pix" ? (
                      <Check className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Identificadores e Rastreabilidade */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Autenticação & Rastreamento Bancário
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                <div>
                  <span className="text-muted-foreground block text-[10px]">ID da Operação</span>
                  <span className="font-mono text-foreground font-medium">{tx.id}</span>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => handleCopy(tx.id, "ID da Operação")}
                  title="Copiar ID"
                  className="no-print"
                >
                  {copiedKey === "ID da Operação" ? (
                    <Check className="size-3 text-primary" />
                  ) : (
                    <Copy className="size-3 text-muted-foreground" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                <div>
                  <span className="text-muted-foreground block text-[10px]">EndToEnd ID (BACEN)</span>
                  <span className="font-mono text-foreground font-medium">
                    {tx.endToEndId || "Ainda não disponível"}
                  </span>
                </div>
                {tx.endToEndId && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => handleCopy(tx.endToEndId!, "EndToEnd ID")}
                    title="Copiar EndToEnd ID"
                    className="no-print"
                  >
                    {copiedKey === "EndToEnd ID" ? (
                      <Check className="size-3 text-primary" />
                    ) : (
                      <Copy className="size-3 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Data de Criação</span>
                  <span className="text-foreground font-medium">
                    {formatDateTime(tx.createdAt, "medium")}
                  </span>
                </div>
                {tx.settledAt && (
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Data de Liquidação</span>
                    <span className="text-foreground font-medium">
                      {formatDateTime(tx.settledAt, "medium")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vínculo com Lote ou Aprovação */}
          {tx.batchId && (
            <div className="p-3 rounded-xl border border-border bg-secondary/40 flex items-center justify-between no-print">
              <div>
                <p className="text-xs font-semibold text-foreground">Operação Vinculada a Saque em Lote</p>
                <p className="text-xs text-muted-foreground">
                  Esta transação corresponde à Parcela {tx.batchInstallmentIndex} do Lote #{tx.batchId}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <NextLink href={`/pix/saques-em-lote/${tx.batchId}`}>Ver Lote</NextLink>
              </Button>
            </div>
          )}

          {tx.approvalRequestId && tx.status === "PENDING_APPROVAL" && (
            <ToastNotice variant="warning" message="Operação aguardando aprovação"
              description="Esta transação foi retida pela regra de aprovação corporativa."
              href={`/aprovacoes/${tx.approvalRequestId}`} actionLabel="Ver aprovação" persistent />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
