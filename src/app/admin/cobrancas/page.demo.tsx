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
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type { Charge, ChargeStatus } from "@/types/domain";

export default function AdminCobrancasPage() {
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

  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "charges", filters],
    queryFn: () =>
      demoRepository.getCharges({
        status: filters.status !== "ALL" ? filters.status : undefined,
        search: filters.search,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
  });

  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código Pix Copia e Cola copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const renderStatusBadge = (st: ChargeStatus) => {
    switch (st) {
      case "PAID":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] gap-1">
            <CheckCircle2 className="size-3" /> Paga
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] gap-1">
            <Clock className="size-3" /> Aguardando
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-muted text-muted-foreground border border-border text-[11px] gap-1">
            <XCircle className="size-3" /> Expirada
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] gap-1">
            <XCircle className="size-3" /> Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Cobranças Dinâmicas Pix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão consolidada de QR Codes dinâmicos gerados por todas as empresas via Painel ou API.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Volume Total em Cobranças
              </span>
              <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {formatCentsToBrl(
                  (data?.data || []).reduce((acc, c) => acc + c.amountInCents, 0)
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <QrCode className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Volume Liquidado
              </span>
              <div className="text-xl font-bold tracking-tight text-emerald-400 mt-1 font-mono">
                {formatCentsToBrl(
                  (data?.data || [])
                    .filter((c) => c.status === "PAID")
                    .reduce((acc, c) => acc + c.amountInCents, 0)
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
                Total de Cobranças Emitidas
              </span>
              <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {data?.total || 0}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary text-muted-foreground border border-border">
              <Percent className="size-5" />
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
          { value: "PAID", label: "Pagas" },
          { value: "PENDING", label: "Aguardando Pagamento" },
          { value: "EXPIRED", label: "Expiradas" },
          { value: "FAILED", label: "Falhou" },
        ]}
        searchPlaceholder="Buscar por ID da cobrança, pagador ou documento..."
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
                  Pagador
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Descrição
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Valor
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Vencimento
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={8} className="h-14 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !data?.data || data.data.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhuma cobrança encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((charge) => (
                  <TableRow
                    key={charge.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {charge.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(charge.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {charge.payerName || "Pagador Anônimo"}
                        </span>
                        {charge.payerDocument && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {charge.payerDocument}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {charge.description || "Cobrança de Serviços"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {formatCentsToBrl(charge.amountInCents)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(charge.expiresAt)}
                    </TableCell>
                    <TableCell>{renderStatusBadge(charge.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCharge(charge)}
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
              Mostrando {data.data.length} de {data.total} cobranças
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

      {/* Charge Detail Modal */}
      {selectedCharge && (
        <Dialog
          open={!!selectedCharge}
          onOpenChange={(open) => !open && setSelectedCharge(null)}
        >
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-semibold">
                  Detalhes da Cobrança Pix
                </DialogTitle>
                {renderStatusBadge(selectedCharge.status)}
              </div>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                ID: {selectedCharge.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-background border border-border text-center">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Valor Nominal
                </span>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {formatCentsToBrl(selectedCharge.amountInCents)}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-background border border-border flex justify-between">
                  <span className="text-muted-foreground">Pagador:</span>
                  <span className="font-medium text-foreground">
                    {selectedCharge.payerName || "Não informado"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex justify-between">
                  <span className="text-muted-foreground">Documento:</span>
                  <span className="font-mono text-foreground">
                    {selectedCharge.payerDocument || "Não informado"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex justify-between">
                  <span className="text-muted-foreground">Expiração:</span>
                  <span className="font-medium text-foreground">
                    {formatDateTime(selectedCharge.expiresAt)}
                  </span>
                </div>
              </div>

              {/* Copia e Cola */}
              <div className="p-3 rounded-lg bg-background border border-border space-y-2">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Código Pix Copia e Cola (EMV)
                </span>
                <div className="p-2 rounded bg-secondary/50 font-mono text-[10px] text-muted-foreground break-all max-h-20 overflow-y-auto">
                  {selectedCharge.copyPasteCode}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyPix(selectedCharge.copyPasteCode)}
                  className="w-full text-xs h-8 border-border gap-1.5"
                >
                  {copied ? (
                    <Check className="size-3.5 text-primary" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Código Copiado" : "Copiar Linha Digitável"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
