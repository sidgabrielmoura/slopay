"use client";

import React from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { useAdminFilters } from "@/features/admin/hooks/use-admin-filters";
import { AdminFilterBar } from "@/features/admin/components/filters/admin-filter-bar";
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
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import type { Batch, BatchStatus } from "@/types/domain";

export default function AdminLotesPage() {
  const {
    filters,
    setSearch,
    setPeriod,
    setCompanyId,
    setAccountId,
    setStatus,
    setPage,
    resetFilters,
  } = useAdminFilters({
    defaultPeriod: "LAST_30_DAYS",
    defaultPageSize: 10,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "batches", filters],
    queryFn: () =>
      demoRepository.getBatches({
        status: filters.status !== "ALL" ? filters.status : undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
  });

  const renderStatusBadge = (st: BatchStatus) => {
    switch (st) {
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] gap-1">
            <CheckCircle2 className="size-3" /> Concluído
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] gap-1">
            <Clock className="size-3" /> Processando
          </Badge>
        );
      case "PARTIALLY_COMPLETED":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] gap-1">
            <AlertTriangle className="size-3" /> Parcial
          </Badge>
        );
      case "PENDING_APPROVAL":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] gap-1">
            <Clock className="size-3" /> Aguardando Alçada
          </Badge>
        );
      case "FAILED":
      case "REJECTED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] gap-1">
            <XCircle className="size-3" /> Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  const batches = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Lotes Globais de Saque
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento de liquidações em lote, parcelamentos automáticos e status de processamento do ecossistema.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Volume Total em Lotes
              </span>
              <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {formatCentsToBrl(
                  batches.reduce((acc, b) => acc + b.totalAmountInCents, 0)
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Total Liquidado em Lotes
              </span>
              <div className="text-xl font-bold tracking-tight text-emerald-400 mt-1 font-mono">
                {formatCentsToBrl(
                  batches.reduce((acc, b) => acc + b.completedAmountInCents, 0)
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Quantidade de Lotes
              </span>
              <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {data?.total || 0}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary text-muted-foreground border border-border">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onPeriodChange={setPeriod}
        onCompanyChange={setCompanyId}
        onAccountChange={setAccountId}
        onStatusChange={setStatus}
        onReset={resetFilters}
        statusOptions={[
          { value: "ALL", label: "Todos os Status" },
          { value: "COMPLETED", label: "Concluídos" },
          { value: "PROCESSING", label: "Processando" },
          { value: "PARTIALLY_COMPLETED", label: "Parcialmente Concluídos" },
          { value: "PENDING_APPROVAL", label: "Aguardando Aprovação" },
          { value: "FAILED", label: "Falhou / Recusado" },
        ]}
        searchPlaceholder="Buscar por ID do lote, beneficiário..."
      />

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Identificador
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Criação
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Favorecido
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-center">
                  Parcelas
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Valor Total
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Tarifas
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={8} className="h-14 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : batches.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhum lote de pagamento registrado.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {batch.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(batch.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {batch.recipientName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {batch.targetKeyType}: {batch.targetKey}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono font-medium text-foreground">
                      {batch.installments?.length || 0}x
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {formatCentsToBrl(batch.totalAmountInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatCentsToBrl(batch.totalFeeInCents || 0)}
                    </TableCell>
                    <TableCell>{renderStatusBadge(batch.status)}</TableCell>
                    <TableCell className="text-right">
                      <NextLink href={`/admin/lotes/${batch.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <Eye className="size-3.5" />
                          Detalhes
                        </Button>
                      </NextLink>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50 text-xs text-muted-foreground">
            <span>
              Mostrando {batches.length} de {data.total} lotes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, data.page - 1))}
                disabled={data.page <= 1}
                className="h-8 px-2.5 border-border"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Anterior
              </Button>
              <span className="font-mono text-foreground font-medium">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(data.totalPages, data.page + 1))}
                disabled={data.page >= data.totalPages}
                className="h-8 px-2.5 border-border"
              >
                Próxima <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
