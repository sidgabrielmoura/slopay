"use client";

import React, { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Percent,
  Eye,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type { Transaction, TransactionStatus, TransactionType } from "@/types/domain";

export default function AdminOperacoesPage() {
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
    defaultPageSize: 12,
  });

  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin",
      "operations",
      filters,
      selectedType,
    ],
    queryFn: () =>
      demoRepository.getGlobalOperations({
        ...filters,
        type: selectedType !== "ALL" ? selectedType : undefined,
      }),
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportCsv = () => {
    if (!data?.data || data.data.length === 0) {
      toast.error("Nenhuma operação para exportar com os filtros atuais.");
      return;
    }

    const headers = [
      "ID",
      "EndToEnd ID",
      "Data/Hora",
      "Empresa",
      "Tipo",
      "Direção",
      "Contraparte",
      "Documento",
      "Valor (BRL)",
      "Taxa SloPay (BRL)",
      "Status",
    ];

    const rows = data.data.map((tx) => [
      tx.id,
      tx.endToEndId || "-",
      formatDateTime(tx.createdAt),
      tx.companyName || "Alpha Tech Ltda",
      tx.type,
      tx.direction,
      `"${tx.counterpartyName.replace(/"/g, '""')}"`,
      tx.counterpartyDocument,
      (tx.amountInCents / 100).toFixed(2),
      ((tx.feeInCents || 0) / 100).toFixed(2),
      tx.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `operacoes-slopay-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Relatório de operações exportado com sucesso!");
  };

  const renderStatusBadge = (st: TransactionStatus) => {
    switch (st) {
      case "COMPLETED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-[11px]">
            Concluída
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-[11px]">
            Processando
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-[11px]">
            Falhou
          </Badge>
        );
      case "REVERSED":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 text-[11px]">
            Estornada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {st}
          </Badge>
        );
    }
  };

  const renderTypePill = (type: TransactionType) => {
    switch (type) {
      case "PIX_RECEIVE":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <ArrowDownLeft className="size-3.5" /> Pix Recebido
          </span>
        );
      case "PIX_WITHDRAW":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <ArrowUpRight className="size-3.5" /> Saque Pix
          </span>
        );
      case "BATCH_ITEM":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400">
            <Layers className="size-3.5" /> Item de Lote
          </span>
        );
      case "REVERSAL":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400">
            <ReceiptText className="size-3.5" /> Devolução
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Operações Globais Pix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento em tempo real de todas as entradas, saques e conciliações do ecossistema.
          </p>
        </div>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          className="h-9 px-3 text-xs gap-1.5 border-border hover:bg-secondary/60"
        >
          <Download className="size-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Volume de Entradas (Pix In)
              </span>
              <div className="text-xl font-bold tracking-tight text-emerald-400 mt-1 font-mono">
                {formatCentsToBrl(data?.totalInflowInCents || 0)}
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
                Volume de Saídas (Pix Out)
              </span>
              <div className="text-xl font-bold tracking-tight text-amber-400 mt-1 font-mono">
                {formatCentsToBrl(data?.totalOutflowInCents || 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Receita de Tarifas Retidas
              </span>
              <div className="text-xl font-bold tracking-tight text-primary mt-1 font-mono">
                {formatCentsToBrl(data?.totalFeesInCents || 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Percent className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tipo Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "ALL", label: "Todas as Operações" },
          { id: "PIX_RECEIVE", label: "Recebimentos (Pix In)" },
          { id: "PIX_WITHDRAW", label: "Saques Diretos (Pix Out)" },
          { id: "BATCH_ITEM", label: "Itens de Lote" },
          { id: "REVERSAL", label: "Devoluções / Estornos" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelectedType(t.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedType === t.id
                ? "bg-secondary text-foreground font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {t.label}
          </button>
        ))}
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
          { value: "COMPLETED", label: "Concluídas" },
          { value: "PROCESSING", label: "Processando" },
          { value: "FAILED", label: "Falhou" },
          { value: "REVERSED", label: "Estornada" },
        ]}
        searchPlaceholder="Buscar por EndToEndId, ID de transação, contraparte ou CPF/CNPJ..."
      />

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Identificador / E2E
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Data e Hora
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Empresa / Conta
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Tipo
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Contraparte
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Valor Bruto
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Tarifa
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
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={9} className="h-14 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data || data.data.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={9}
                    className="h-36 text-center text-muted-foreground text-sm"
                  >
                    Nenhuma operação encontrada com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {tx.id}
                        </span>
                        {tx.endToEndId && (
                          <span
                            className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]"
                            title={tx.endToEndId}
                          >
                            {tx.endToEndId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(tx.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {tx.companyName || "Alpha Tech Ltda"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Conta: 0001-9
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{renderTypePill(tx.type)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {tx.counterpartyName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {tx.counterpartyDocument}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {formatCentsToBrl(tx.amountInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatCentsToBrl(tx.feeInCents || 0)}
                    </TableCell>
                    <TableCell>{renderStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTx(tx)}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <Eye className="size-3.5" />
                        Detalhes
                      </Button>
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
              Mostrando {data.data.length} de {data.total} operações
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

      {/* Transaction Details Modal */}
      {selectedTx && (
        <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
          <DialogContent className="max-w-2xl bg-card border-border text-foreground">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-semibold">
                  Dossiê da Transação Pix
                </DialogTitle>
                {renderStatusBadge(selectedTx.status)}
              </div>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                ID da Transação: {selectedTx.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Valor e Tipo */}
              <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Valor da Operação
                  </span>
                  <div className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {formatCentsToBrl(selectedTx.amountInCents)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Tarifa de Liquidação
                  </span>
                  <div className="text-sm font-mono text-muted-foreground mt-0.5">
                    {formatCentsToBrl(selectedTx.feeInCents || 0)}
                  </div>
                </div>
              </div>

              {/* EndToEnd ID */}
              {selectedTx.endToEndId && (
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      EndToEnd ID (SPI / Banco Central)
                    </span>
                    <span className="text-xs font-mono text-foreground break-all">
                      {selectedTx.endToEndId}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(selectedTx.endToEndId!, "EndToEnd ID")}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {copiedField === "EndToEnd ID" ? (
                      <Check className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              )}

              {/* Grid de Metadados */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Empresa Beneficiária / Origem
                  </span>
                  <span className="font-semibold text-foreground mt-1 block">
                    {selectedTx.companyName || "Alpha Tech Ltda"}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    CNPJ: 12.345.678/0001-90
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Contraparte
                  </span>
                  <span className="font-semibold text-foreground mt-1 block">
                    {selectedTx.counterpartyName}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Doc: {selectedTx.counterpartyDocument}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Data de Liquidação
                  </span>
                  <span className="font-medium text-foreground mt-1 block">
                    {formatDateTime(selectedTx.createdAt)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Instituição Financeira / ISPB
                  </span>
                  <span className="font-medium text-foreground mt-1 block">
                    SloPay IP (12345678)
                  </span>
                </div>
              </div>

              {/* Descrição informada */}
              {selectedTx.description && (
                <div className="p-3 rounded-lg bg-background border border-border">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Mensagem / Descritivo
                  </span>
                  <p className="text-xs text-foreground mt-0.5">
                    {selectedTx.description}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
