"use client";

import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";

export function BatchDetailScreen({ batchId }: { batchId: string }) {
  const router = useRouter();
  const service = useGatewayService();
  const { hideValues } = usePreferences();

  const { data: batch, isLoading, isError } = useQuery({
    queryKey: queryKeys.batch(batchId),
    queryFn: () => service.getBatchById(batchId),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in-50">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Empty
          title="Lote não encontrado"
          description={`O lote com ID "${batchId}" não foi localizado.`}
          action={
            <Button asChild variant="outline">
              <NextLink href="/pix/saques-em-lote">Voltar aos Lotes</NextLink>
            </Button>
          }
        />
      </div>
    );
  }

  const completedPct =
    batch.totalAmountInCents > 0
      ? Math.round((batch.completedAmountInCents / batch.totalAmountInCents) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/pix/saques-em-lote")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar aos Lotes</span>
        </Button>

        <Badge
          variant={
            batch.status === "COMPLETED"
              ? "success"
              : batch.status === "PENDING_APPROVAL"
                ? "warning"
                : batch.status === "PARTIALLY_COMPLETED"
                  ? "destructive"
                  : "secondary"
          }
          className="text-xs px-3 py-1"
        >
          {batch.status === "COMPLETED"
            ? "Lote Concluído"
            : batch.status === "PENDING_APPROVAL"
              ? "Aguardando Aprovação"
              : batch.status === "PARTIALLY_COMPLETED"
                ? "Parcialmente Concluído"
                : batch.status}
        </Badge>
      </div>

      {/* Card de Resumo do Lote */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lote #{batch.id}
              </span>
              <CardTitle className="text-xl font-bold text-foreground mt-0.5">
                {batch.recipientName}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Chave: {batch.targetKey} ({batch.targetKeyType})
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-muted-foreground">Montante Total</span>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {formatCentsToBrl(batch.totalAmountInCents, { hideValue: hideValues })}
              </p>
            </div>
          </div>

          {/* Barra de Progresso do Lote */}
          <div className="space-y-1.5 pt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso de Liquidação ({completedPct}%)</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatCentsToBrl(batch.completedAmountInCents, { hideValue: hideValues })} de {formatCentsToBrl(batch.totalAmountInCents, { hideValue: hideValues })}
              </span>
            </div>
            <Progress value={completedPct} />
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block">Data de Criação</span>
              <span className="font-medium text-foreground">
                {formatDateTime(batch.createdAt, "short")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Total de Parcelas</span>
              <span className="font-medium text-foreground">
                {batch.installments.length} parcelas
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Tarifas Totais</span>
              <span className="font-medium text-foreground">
                {formatCentsToBrl(batch.totalFeeInCents, { hideValue: hideValues })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Total Debitado</span>
              <span className="font-bold text-primary">
                {formatCentsToBrl(batch.totalDebitInCents, { hideValue: hideValues })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Parcelas do Lote */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Parcelas Vinculadas ao Lote
          </CardTitle>
          <CardDescription className="text-xs">
            Cada parcela é uma transferência Pix individual de até R$ 15.000,00 para a mesma chave.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Principal</TableHead>
                <TableHead className="text-right">Tarifa</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.installments.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="text-xs font-semibold text-foreground">
                    #{inst.index} de {inst.totalInstallments}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {inst.transactionId || inst.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inst.status === "COMPLETED"
                          ? "success"
                          : inst.status === "PENDING_APPROVAL"
                            ? "warning"
                            : inst.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {inst.status === "COMPLETED"
                        ? "Concluído"
                        : inst.status === "PENDING_APPROVAL"
                          ? "Aguardando"
                          : inst.status === "FAILED"
                            ? "Falhou"
                            : inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">
                    {formatCentsToBrl(inst.amountInCents, { hideValue: hideValues })}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatCentsToBrl(inst.feeInCents, { hideValue: hideValues })}
                  </TableCell>
                  <TableCell className="text-right">
                    {inst.transactionId ? (
                      <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
                        <NextLink href={`/movimentacoes/${inst.transactionId}`}>
                          <span>Ver Transação</span>
                          <ArrowRight className="size-3.5 ml-1" />
                        </NextLink>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendente</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
