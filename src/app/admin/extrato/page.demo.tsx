"use client";

import React from "react";
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
  FileSpreadsheet,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { LedgerEntry } from "@/types/domain";

export default function AdminExtratoPage() {
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
    defaultPageSize: 15,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ledger", filters],
    queryFn: () => demoRepository.getGlobalLedgerEntries(filters),
  });

  const entries = data?.data || [];

  const handleExportCsv = () => {
    if (!entries.length) {
      toast.error("Nenhum lançamento no extrato para exportar.");
      return;
    }

    const headers = [
      "ID Lançamento",
      "Transação",
      "Data e Hora",
      "Tipo",
      "Descrição",
      "Valor (BRL)",
      "Saldo Resultante (BRL)",
    ];

    const rows = entries.map((e) => [
      e.id,
      e.transactionId || "-",
      formatDateTime(e.date),
      e.type,
      `"${e.description.replace(/"/g, '""')}"`,
      (e.amountInCents / 100).toFixed(2),
      (e.balanceAfterInCents / 100).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `extrato-consolidado-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Extrato consolidado exportado com sucesso!");
  };

  const renderTypePill = (type: "CREDIT" | "DEBIT" | "FEE_DEBIT") => {
    switch (type) {
      case "CREDIT":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <ArrowDownLeft className="size-3.5" /> Crédito
          </span>
        );
      case "DEBIT":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
            <ArrowUpRight className="size-3.5" /> Débito
          </span>
        );
      case "FEE_DEBIT":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Receipt className="size-3.5" /> Tarifa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Extrato Contábil Consolidado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Razão contábil e conciliação de todos os lançamentos em conta gráfica do ecossistema.
          </p>
        </div>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          className="h-9 px-3 text-xs gap-1.5 border-border hover:bg-secondary/60"
        >
          <Download className="size-3.5" /> Exportar CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onPeriodChange={setPeriod}
        onCompanyChange={setCompanyId}
        onAccountChange={setAccountId}
        onReset={resetFilters}
        searchPlaceholder="Buscar por ID de lançamento, transação vinculada ou texto contábil..."
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
                  Data e Hora
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Transação Ref.
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Tipo
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Histórico Contábil
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Valor
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Saldo Resultante
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7} className="h-12 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : entries.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhum lançamento registrado no período.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {entry.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(entry.date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.transactionId || "-"}
                    </TableCell>
                    <TableCell>{renderTypePill(entry.type)}</TableCell>
                    <TableCell className="text-xs text-foreground font-medium max-w-[280px] truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs font-semibold whitespace-nowrap ${
                        entry.amountInCents > 0
                          ? "text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {entry.amountInCents > 0 ? "+" : ""}
                      {formatCentsToBrl(entry.amountInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatCentsToBrl(entry.balanceAfterInCents)}
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
              Mostrando {entries.length} de {data.total} lançamentos
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
