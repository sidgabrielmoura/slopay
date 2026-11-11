"use client";

import React, { use } from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import type { BatchStatus, TransactionStatus } from "@/types/domain";

export default function AdminLoteDetailPage({
  params,
}: {
  params: Promise<{ loteId: string }>;
}) {
  const { loteId } = use(params);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["admin", "batch", loteId],
    queryFn: () => demoRepository.getBatchById(loteId),
  });

  const renderStatusBadge = (st: BatchStatus) => {
    switch (st) {
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs gap-1">
            <CheckCircle2 className="size-3.5" /> Concluído
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs gap-1">
            <Clock className="size-3.5" /> Processando
          </Badge>
        );
      case "PARTIALLY_COMPLETED":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs gap-1">
            <AlertTriangle className="size-3.5" /> Parcial
          </Badge>
        );
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs gap-1">
            <Clock className="size-3.5" /> Aguardando Alçada
          </Badge>
        );
      case "FAILED":
      case "REJECTED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs gap-1">
            <XCircle className="size-3.5" /> Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  const renderInstallmentStatus = (st: TransactionStatus) => {
    switch (st) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="size-3" /> Liquidada
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
            <Clock className="size-3" /> Em envio
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
            <XCircle className="size-3" /> Falha
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{st}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-secondary/50 rounded animate-pulse w-48" />
        <div className="h-32 bg-secondary/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-16 text-center space-y-4">
        <Layers className="size-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Lote não encontrado</h2>
        <p className="text-sm text-muted-foreground">
          O identificador &quot;{loteId}&quot; não consta nos registros operacionais.
        </p>
        <NextLink href="/admin/lotes">
          <Button variant="outline" className="border-border">
            Voltar para lista de lotes
          </Button>
        </NextLink>
      </div>
    );
  }

  const completedCount =
    batch.installments?.filter((i) => i.status === "COMPLETED").length || 0;
  const totalCount = batch.installments?.length || 1;
  const percentComplete = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <NextLink href="/admin/lotes">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          >
            <ArrowLeft className="size-3.5" /> Voltar aos Lotes
          </Button>
        </NextLink>
      </div>

      {/* Header card */}
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {batch.id}
            </h1>
            {renderStatusBadge(batch.status)}
          </div>
          <p className="text-xs text-muted-foreground">
            Criado em {formatDateTime(batch.createdAt)} • Beneficiário:{" "}
            <span className="font-semibold text-foreground">
              {batch.recipientName}
            </span>{" "}
            ({batch.targetKeyType}: {batch.targetKey})
          </p>
        </div>

        {batch.approvalRequestId && (
          <NextLink href="/admin/aprovacoes-financeiras">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-1.5"
            >
              <ShieldAlert className="size-3.5" /> Ver Alçada Pendente
            </Button>
          </NextLink>
        )}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Valor Total Bruto
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
              {formatCentsToBrl(batch.totalAmountInCents)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Tarifas Totais
            </span>
            <div className="text-xl font-bold tracking-tight text-muted-foreground mt-1 font-mono">
              {formatCentsToBrl(batch.totalFeeInCents)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Total Debitado
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
              {formatCentsToBrl(batch.totalDebitInCents)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Progresso ({percentComplete}%)
            </span>
            <div className="text-xl font-bold tracking-tight text-emerald-400 mt-1 font-mono">
              {completedCount} / {totalCount}
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installments Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Desdobramento das Parcelas ({batch.installments?.length || 0})
          </h2>
          <span className="text-xs text-muted-foreground">
            Liquidações fracionadas no Sistema de Pagamentos Instantâneos (SPI)
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  #
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Identificador
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Valor
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Tarifa
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Liquidação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.installments?.map((inst) => (
                <TableRow key={inst.id} className="border-border">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inst.index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-foreground">
                    {inst.id}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                    {formatCentsToBrl(inst.amountInCents)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatCentsToBrl(inst.feeInCents)}
                  </TableCell>
                  <TableCell>{renderInstallmentStatus(inst.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {inst.settledAt ? formatDateTime(inst.settledAt) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
