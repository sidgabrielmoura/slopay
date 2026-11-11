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
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Search,
  Download,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import type { TransactionDirection, TransactionStatus } from "@/types/domain";

interface TransactionsScreenProps {
  initialTab?: "ALL" | "IN" | "OUT" | "SEARCH";
}

export function TransactionsScreen({ initialTab = "ALL" }: TransactionsScreenProps) {
  const router = useRouter();
  const service = useGatewayService();
  const { hideValues } = usePreferences();

  const [direction, setDirection] = useState<TransactionDirection | undefined>(
    initialTab === "IN" ? "IN" : initialTab === "OUT" ? "OUT" : undefined
  );
  const [status, setStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.transactions({
      direction,
      status: status !== "ALL" ? status : undefined,
      search: searchTerm,
      page,
      pageSize,
    }),
    queryFn: () =>
      service.getTransactions({
        direction,
        status: status !== "ALL" ? status : undefined,
        search: searchTerm,
        page,
        pageSize,
      }),
  });

  const handleExportCsv = () => {
    if (!data?.data) return;

    if (hideValues) {
      toast.error(
        "Desative o modo de privacidade para autorizar a exportação de valores."
      );
      return;
    }

    // Sanitização de fórmulas e caracteres especiais
    const headers = [
      "ID",
      "EndToEnd ID",
      "Data",
      "Tipo",
      "Direção",
      "Contraparte",
      "Documento",
      "Valor Principal (R$)",
      "Tarifa (R$)",
      "Total (R$)",
      "Status",
    ];

    const rows = data.data.map((t) => [
      `"${t.id}"`,
      `"${t.endToEndId || "N/A"}"`,
      `"${formatDateTime(t.createdAt, "short")}"`,
      `"${t.type}"`,
      `"${t.direction}"`,
      `"${t.counterpartyName.replace(/"/g, '""')}"`,
      `"${t.counterpartyDocument || "N/A"}"`,
      `"${(t.amountInCents / 100).toFixed(2)}"`,
      `"${(t.feeInCents / 100).toFixed(2)}"`,
      `"${(t.totalDebitedInCents / 100).toFixed(2)}"`,
      `"${t.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "# Demonstração - Dados Fictícios - SloPay Pix\n" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_pix_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Extrato exportado em CSV com sucesso.");
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Movimentações Pix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico completo de lançamentos, liquidações e tarifas da conta.
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-border gap-2 sm:gap-6 overflow-x-auto text-sm font-medium">
        <NextLink
          href="/movimentacoes"
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition-colors ${
            initialTab === "ALL"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Extrato Consolidado
        </NextLink>
        <NextLink
          href="/movimentacoes/recebimentos"
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition-colors ${
            initialTab === "IN"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Recebimentos Pix
        </NextLink>
        <NextLink
          href="/movimentacoes/saidas"
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition-colors ${
            initialTab === "OUT"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Saídas Pix
        </NextLink>
        <NextLink
          href="/movimentacoes/buscar"
          className={`pb-3 px-1 border-b-2 whitespace-nowrap transition-colors ${
            initialTab === "SEARCH"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Busca Avançada
        </NextLink>
      </div>

      {/* Cards de Totais do Filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground font-medium">Total de Entradas</p>
          <p className="text-xl font-bold tabular-nums text-[var(--success)] mt-1">
            {formatCentsToBrl(data?.totalInflowInCents ?? 0, {
              hideValue: hideValues,
              showSign: true,
            })}
          </p>
        </Card>
        <Card className="border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground font-medium">Total de Saídas</p>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">
            {formatCentsToBrl(data?.totalOutflowInCents ?? 0, {
              hideValue: hideValues,
            })}
          </p>
        </Card>
        <Card className="border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground font-medium">Tarifas do Período</p>
          <p className="text-xl font-bold tabular-nums text-muted-foreground mt-1">
            {formatCentsToBrl(data?.totalFeesInCents ?? 0, {
              hideValue: hideValues,
            })}
          </p>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por ID, EndToEnd ID, favorecido ou descrição..."
            className="pl-9 h-10 bg-card/80"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 h-10 bg-card/80">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="COMPLETED">Concluído</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Aguardando aprovação</SelectItem>
              <SelectItem value="PROCESSING">Processando</SelectItem>
              <SelectItem value="FAILED">Falhou</SelectItem>
              <SelectItem value="REJECTED">Recusado</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm || status !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatus("ALL");
                setPage(1);
              }}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Tabela de Transações */}
      <Card className="border-border bg-card/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8">
            <Empty
              title="Nenhuma movimentação encontrada"
              description={
                searchTerm || status !== "ALL"
                  ? "Tente ajustar os filtros de busca para encontrar transações."
                  : "Nenhuma operação registrada nesta categoria."
              }
              action={
                (searchTerm || status !== "ALL") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatus("ALL");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Tipo / Direção</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Líquido</TableHead>
                  <TableHead className="text-right">Tarifa</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((tx) => {
                  const isReceive = tx.direction === "IN";
                  return (
                    <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateTime(tx.createdAt, "short")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
                              isReceive
                                ? "bg-[var(--success-surface)] text-[var(--success)]"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            {isReceive ? (
                              <ArrowDownLeft className="size-3" />
                            ) : (
                              <ArrowUpRight className="size-3" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {isReceive ? "Recebimento Pix" : "Saque Pix"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col min-w-0 max-w-[220px]">
                          <span className="text-sm font-medium text-foreground truncate">
                            {tx.counterpartyName}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {tx.counterpartyDocument || tx.counterpartyKey || tx.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.status === "COMPLETED"
                              ? "success"
                              : tx.status === "PENDING_APPROVAL"
                              ? "warning"
                              : tx.status === "PROCESSING"
                              ? "info"
                              : tx.status === "FAILED" || tx.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {tx.status === "COMPLETED"
                            ? "Concluído"
                            : tx.status === "PENDING_APPROVAL"
                            ? "Aguardando"
                            : tx.status === "PROCESSING"
                            ? "Processando"
                            : tx.status === "FAILED"
                            ? "Falhou"
                            : tx.status === "REJECTED"
                            ? "Recusado"
                            : tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-semibold tabular-nums ${
                          isReceive ? "text-[var(--success)]" : "text-foreground"
                        }`}
                      >
                        {formatCentsToBrl(tx.amountInCents, {
                          hideValue: hideValues,
                          showSign: isReceive,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {formatCentsToBrl(tx.feeInCents, { hideValue: hideValues })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/movimentacoes/${tx.id}`)}
                          className="text-xs text-primary hover:text-primary font-medium"
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Paginação */}
            <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
              <span>
                Mostrando {data.data.length} de {data.total} registros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="size-8 p-0"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="font-medium text-foreground">
                  Página {page} de {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="size-8 p-0"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
