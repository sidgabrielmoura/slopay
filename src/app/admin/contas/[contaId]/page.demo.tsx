"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import {
  Wallet,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Building2,
  QrCode,
  KeyRound,
  ArrowDownUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { AccountOperationalStatus } from "@/types/domain";

export default function AdminContaDetalhePage() {
  const params = useParams();
  const contaId = params.contaId as string;
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  const { data: account, isLoading } = useQuery({
    queryKey: ["admin_account_detail", contaId],
    queryFn: () => service.getAccountById(contaId),
  });

  const { data: operationsData } = useQuery({
    queryKey: ["admin_account_operations", contaId],
    queryFn: () => service.getGlobalOperations({ accountId: contaId, pageSize: 15 }),
    enabled: Boolean(account),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      reason,
    }: {
      status: AccountOperationalStatus;
      reason: string;
    }) => {
      return service.setAccountStatus(contaId, status, reason);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin_account_detail", contaId] });
      queryClient.invalidateQueries({ queryKey: ["admin_accounts_list"] });
      toast.success(
        `Conta ${updated.accountNumber} ${
          updated.status === "SUSPENDED" ? "bloqueada" : "desbloqueada"
        } com sucesso.`
      );
      setStatusDialogOpen(false);
      setStatusReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao alterar status da conta.");
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        Carregando detalhes da conta operacional...
      </div>
    );
  }

  if (!account) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Conta operacional não encontrada.</p>
        <NextLink href="/admin/contas">
          <Button variant="outline" size="sm" className="text-xs border-border">
            <ArrowLeft className="size-3.5 mr-1.5" /> Voltar para Contas
          </Button>
        </NextLink>
      </div>
    );
  }

  const isBlocked = account.status === "SUSPENDED";
  const nextStatus: AccountOperationalStatus = isBlocked ? "ACTIVE" : "SUSPENDED";

  const available = account.availableBalanceInCents ?? account.currentAvailableBalanceInCents ?? 0;
  const book = account.bookBalanceInCents ?? account.settledBalanceInCents ?? 0;
  const reserved = account.reservedBalanceInCents ?? 0;
  const dailyLimit = account.dailyLimitInCents;
  const usedLimit = account.usedDailyLimitInCents ?? 0;
  const limitPct = dailyLimit > 0 ? Math.min(100, Math.round((usedLimit / dailyLimit) * 100)) : 0;

  return (
    <div className="space-y-6">
      <NextLink
        href="/admin/contas"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Voltar para contas operacionais
      </NextLink>

      {/* Header da Conta */}
      <div className="p-6 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-secondary/80 border border-border flex items-center justify-center font-bold text-foreground text-lg shrink-0">
            <Wallet className="size-6 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">Conta SPI:</span>
              <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">
                {account.accountNumber}
              </h1>
              <Badge
                variant="outline"
                className={
                  !isBlocked
                    ? "border-primary/40 text-primary bg-primary/10"
                    : "border-destructive/40 text-destructive bg-destructive/10"
                }
              >
                {!isBlocked ? "Operacional" : "Bloqueada Preventivamente"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3.5 text-muted-foreground" />
              Titular:{" "}
              {account.companyId ? (
                <NextLink
                  href={`/admin/empresas/${account.companyId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {account.companyTradeName || account.companyName}
                </NextLink>
              ) : (
                <span className="text-foreground">{account.companyName}</span>
              )}
            </p>
          </div>
        </div>

        <Button
          variant={isBlocked ? "default" : "destructive"}
          size="sm"
          className="h-9 text-xs font-medium gap-1.5"
          onClick={() => setStatusDialogOpen(true)}
        >
          {isBlocked ? (
            <>
              <ShieldCheck className="size-3.5" /> Desbloquear Conta
            </>
          ) : (
            <>
              <ShieldAlert className="size-3.5" /> Bloqueio Preventivo
            </>
          )}
        </Button>
      </div>

      {/* Balanços e Limites */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Saldo Disponível Líquido</span>
          <p className="text-xl font-bold font-mono text-primary">
            {formatCentsToBrl(available)}
          </p>
          <span className="text-[10px] text-muted-foreground">Livre para liquidação instantânea</span>
        </Card>

        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Saldo Contabilizado (Ledger)</span>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatCentsToBrl(book)}
          </p>
          <span className="text-[10px] text-muted-foreground">Posição contábil antes de reservas</span>
        </Card>

        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Reserva Técnica / Bloqueios</span>
          <p className="text-xl font-bold font-mono text-muted-foreground">
            {formatCentsToBrl(reserved)}
          </p>
          <span className="text-[10px] text-muted-foreground">Retenções de quórum ou disputas</span>
        </Card>

        <Card className="bg-card border-border p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Limite Diário SPI</span>
            <span className="font-mono">{limitPct}% usado</span>
          </div>
          <p className="text-sm font-bold font-mono text-foreground">
            {formatCentsToBrl(usedLimit)} / {formatCentsToBrl(dailyLimit)}
          </p>
          <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${limitPct}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Chaves Pix Cadastradas na Conta */}
      <Card className="bg-card border-border p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          Chaves Pix DICT Registradas
        </h2>
        <div className="flex flex-wrap gap-2 pt-1">
          {account.pixKeys && account.pixKeys.length > 0 ? (
            account.pixKeys.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs"
              >
                <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 border-border">
                  {k.type}
                </Badge>
                <span className="font-mono text-foreground">{k.value}</span>
                <CheckCircle2 className="size-3 text-primary shrink-0" />
              </div>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              Nenhuma chave Pix avulsa cadastrada nesta conta.
            </span>
          )}
        </div>
      </Card>

      {/* Movimentações Recentes desta Conta */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ArrowDownUp className="size-4 text-muted-foreground" />
              Movimentações Recentes da Conta
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Extrato operacional individualizado
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Contraparte</th>
                  <th className="py-2.5 px-4">Valor</th>
                  <th className="py-2.5 px-4">Tarifa</th>
                  <th className="py-2.5 px-4">Data/Hora</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {operationsData?.data && operationsData.data.length > 0 ? (
                  operationsData.data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-secondary/20">
                      <td className="py-3 px-4 font-mono font-medium">
                        {tx.direction === "IN" ? (
                          <span className="text-primary font-semibold">CRÉDITO</span>
                        ) : (
                          <span className="text-foreground">DÉBITO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {tx.counterpartyName}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {formatCentsToBrl(tx.amountInCents)}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {formatCentsToBrl(tx.feeInCents)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-[10px] border-border">
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhuma transação registrada nesta conta no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Bloqueio/Desbloqueio */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {isBlocked ? "Desbloquear Conta" : "Bloquear Conta Operacional"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Conta {account.accountNumber} ({account.companyTradeName || account.companyName})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Justificativa Operacional Obrigatória
              </label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Informe o motivo para gravação no log de auditoria..."
                rows={3}
                className="text-xs bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusDialogOpen(false)}
              className="border-border text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant={isBlocked ? "default" : "destructive"}
              size="sm"
              disabled={statusMutation.isPending || !statusReason.trim()}
              onClick={() =>
                statusMutation.mutate({ status: nextStatus, reason: statusReason })
              }
              className="text-xs font-medium"
            >
              {statusMutation.isPending
                ? "Gravando..."
                : isBlocked
                ? "Confirmar Desbloqueio"
                : "Confirmar Bloqueio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
