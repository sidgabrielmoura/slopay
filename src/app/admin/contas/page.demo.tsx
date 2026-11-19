"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { useAdminFilters } from "@/features/admin/hooks/use-admin-filters";
import { AdminFilterBar } from "@/features/admin/components/filters/admin-filter-bar";
import {
  Wallet,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCentsToBrl } from "@/lib/money";
import type { Account, AccountOperationalStatus } from "@/types/domain";

export default function AdminContasPage() {
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const {
    filters,
    setSearch,
    setCompany,
    setStatus,
    setPage,
    resetFilters,
  } = useAdminFilters();

  const [statusDialogTarget, setStatusDialogTarget] = useState<{
    account: Account;
    nextStatus: AccountOperationalStatus;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin_accounts_list", filters],
    queryFn: () => service.getAccounts(filters),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      accountId,
      status,
      reason,
    }: {
      accountId: string;
      status: AccountOperationalStatus;
      reason: string;
    }) => {
      return service.setAccountStatus(accountId, status, reason);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin_accounts_list"] });
      toast.success(
        `Status da conta ${updated.accountNumber} alterado para ${
          updated.status === "SUSPENDED" ? "BLOQUEADA" : "ATIVA"
        }.`
      );
      setStatusDialogTarget(null);
      setStatusReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao alterar status da conta.");
    },
  });

  const statusOptions = [
    { value: "ALL", label: "Todas" },
    { value: "ACTIVE", label: "Operacionais" },
    { value: "SUSPENDED", label: "Bloqueadas" },
    { value: "DEACTIVATED", label: "Encerradas" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Wallet className="size-6 text-primary" />
          Contas Operacionais Pix
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Monitoramento de posições de tesouraria, limites do Bacen e bloqueios operacionais preventivos.
        </p>
      </div>

      {/* Filtros */}
      <AdminFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onCompanyChange={setCompany}
        onStatusChange={setStatus}
        onReset={resetFilters}
        statusOptions={statusOptions}
        showAccountFilter={false}
        showPeriodFilter={false}
        searchPlaceholder="Buscar por número de conta ou empresa..."
      />

      {/* Tabela de Contas */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Conta Operacional</th>
                <th className="py-3 px-4">Empresa Titular</th>
                <th className="py-3 px-4 text-right">Saldo Disponível</th>
                <th className="py-3 px-4 text-right">Saldo Contábil</th>
                <th className="py-3 px-4 text-right">Reserva Ativa</th>
                <th className="py-3 px-4 text-right">Limite Diário SPI</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Carregando contas operacionais...
                  </td>
                </tr>
              ) : result?.data && result.data.length > 0 ? (
                result.data.map((acc) => (
                  <tr key={acc.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <NextLink
                        href={`/admin/contas/${acc.id}`}
                        className="font-mono font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                      >
                        {acc.accountNumber}
                        <ExternalLink className="size-3 opacity-60" />
                      </NextLink>
                    </td>

                    <td className="py-3.5 px-4">
                      {acc.companyId ? (
                        <NextLink
                          href={`/admin/empresas/${acc.companyId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {acc.companyTradeName || acc.companyName}
                        </NextLink>
                      ) : (
                        <span className="text-foreground">{acc.companyName}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                      {formatCentsToBrl(
                        acc.availableBalanceInCents || acc.currentAvailableBalanceInCents || 0
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCentsToBrl(
                        acc.bookBalanceInCents || acc.settledBalanceInCents || 0
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                      {formatCentsToBrl(acc.reservedBalanceInCents || 0)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                      {formatCentsToBrl(acc.dailyLimitInCents)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={
                          acc.status === "ACTIVE"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : "border-destructive/40 text-destructive bg-destructive/10"
                        }
                      >
                        {acc.status === "ACTIVE" ? "Operacional" : "Bloqueada"}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <NextLink href={`/admin/contas/${acc.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 border-border">
                            Ver
                          </Button>
                        </NextLink>

                        {acc.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setStatusDialogTarget({ account: acc, nextStatus: "SUSPENDED" })
                            }
                            className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                          >
                            Bloquear
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setStatusDialogTarget({ account: acc, nextStatus: "ACTIVE" })
                            }
                            className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                          >
                            Desbloquear
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhuma conta operacional localizada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {result && result.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              Página {result.page} de {result.totalPages} ({result.total} contas)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                disabled={result.page <= 1}
                onClick={() => setPage(result.page - 1)}
              >
                <ChevronLeft className="size-3.5 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                disabled={result.page >= result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                Próxima <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Bloqueio/Desbloqueio com Motivo */}
      <Dialog
        open={Boolean(statusDialogTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialogTarget(null);
            setStatusReason("");
          }
        }}
      >
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {statusDialogTarget?.nextStatus === "SUSPENDED"
                ? "Confirmar Bloqueio Operacional da Conta"
                : "Desbloquear Conta Operacional"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Conta {statusDialogTarget?.account.accountNumber} ({statusDialogTarget?.account.companyTradeName || statusDialogTarget?.account.companyName})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {statusDialogTarget?.nextStatus === "SUSPENDED"
                ? "O bloqueio impede imediatamente qualquer emissão de Pix ou liquidação de saques por esta conta."
                : "A liberação permite que a conta volte a liquidar transações instantâneas normalmente."}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Justificativa Operacional (Obrigatória)
              </label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Informe o motivo para registro no log de auditoria..."
                rows={3}
                className="text-xs bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusDialogTarget(null);
                setStatusReason("");
              }}
              className="border-border text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant={statusDialogTarget?.nextStatus === "SUSPENDED" ? "destructive" : "default"}
              size="sm"
              disabled={statusMutation.isPending || !statusReason.trim()}
              onClick={() =>
                statusDialogTarget &&
                statusMutation.mutate({
                  accountId: statusDialogTarget.account.id,
                  status: statusDialogTarget.nextStatus,
                  reason: statusReason,
                })
              }
              className="text-xs font-medium"
            >
              {statusMutation.isPending
                ? "Salvando..."
                : statusDialogTarget?.nextStatus === "SUSPENDED"
                  ? "Confirmar Bloqueio"
                  : "Desbloquear Conta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
