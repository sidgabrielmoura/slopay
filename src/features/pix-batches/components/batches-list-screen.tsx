"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Layers,
  Plus,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export function BatchesListScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { hideValues } = usePreferences();

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.batches(),
    queryFn: () => service.getBatches(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Saques em Lote
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão e acompanhamento de lotes corporativos particionados para a mesma chave Pix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            <span>Atualizar</span>
          </Button>
          <Button asChild size="sm" className="gap-1.5 font-semibold">
            <NextLink href="/pix/saques-em-lote/novo">
              <Plus className="size-4" />
              <span>Novo Lote</span>
            </NextLink>
          </Button>
        </div>
      </div>

      {/* Info Card sobre Regras de Lote */}
      <div className="p-4 rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Política Operacional de Lotes
        </p>
        <p>
          Montantes a partir de <strong>R$ 30.000,00</strong> são particionados automaticamente em parcelas de até <strong>R$ 15.000,00</strong> para a mesma chave Pix de destino, otimizando a liquidação e o controle de alçada.
        </p>
      </div>

      <Card className="border-border bg-card/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8">
            <Empty
              title="Nenhum lote registrado"
              description="Sua conta ainda não possui saques em lote cadastrados."
              action={
                <Button asChild size="sm">
                  <NextLink href="/pix/saques-em-lote/novo">Criar Primeiro Lote</NextLink>
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data / Criação</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Favorecido</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Concluído</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((batch) => (
                <TableRow
                  key={batch.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => router.push(`/pix/saques-em-lote/${batch.id}`)}
                >
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatDateTime(batch.createdAt, "short")}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {batch.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {batch.recipientName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {batch.targetKey}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {batch.installments.length} parcelas
                  </TableCell>
                  <TableCell>
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
                      className="text-[11px]"
                    >
                      {batch.status === "COMPLETED"
                        ? "Concluído"
                        : batch.status === "PENDING_APPROVAL"
                        ? "Aguardando Aprovação"
                        : batch.status === "PARTIALLY_COMPLETED"
                        ? "Parcialmente Concluído"
                        : batch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold tabular-nums text-foreground">
                    {formatCentsToBrl(batch.totalAmountInCents, { hideValue: hideValues })}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-[var(--success)]">
                    {formatCentsToBrl(batch.completedAmountInCents, { hideValue: hideValues })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary font-medium"
                    >
                      <span>Detalhes</span>
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
