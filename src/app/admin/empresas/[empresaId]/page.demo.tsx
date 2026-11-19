"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import {
  Building2,
  ArrowLeft,
  Edit,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  ArrowDownUp,
  Sliders,
  History,
  Globe,
  Phone,
  Mail,
  User,
  Calendar,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { CompanyStatus } from "@/types/domain";

export default function AdminEmpresaDetalhePage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = use(params);
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusReason, setStatusReason] = useState("");

  const { data: company, isLoading } = useQuery({
    queryKey: ["admin_company_detail", empresaId],
    queryFn: () => service.getCompanyById(empresaId),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["admin_company_accounts", empresaId],
    queryFn: () => service.getAccounts({ companyId: empresaId }),
    enabled: Boolean(company),
  });

  const { data: operationsData } = useQuery({
    queryKey: ["admin_company_operations", empresaId],
    queryFn: () => service.getGlobalOperations({ companyId: empresaId, pageSize: 10 }),
    enabled: Boolean(company),
  });

  const { data: auditData } = useQuery({
    queryKey: ["admin_company_audit", empresaId],
    queryFn: () => service.getAuditEvents({ search: company?.tradeName || empresaId }),
    enabled: Boolean(company),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      reason,
    }: {
      status: CompanyStatus;
      reason: string;
    }) => {
      return service.setCompanyStatus(empresaId, status, reason);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin_company_detail", empresaId] });
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      toast.success(
        `Status atualizado para ${updated.status === "SUSPENDED" ? "SUSPENSA" : "ATIVA"}.`
      );
      setStatusDialogOpen(false);
      setStatusReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao alterar status da empresa.");
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        Carregando detalhes da empresa...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Empresa não encontrada.</p>
        <NextLink href="/admin/empresas">
          <Button variant="outline" size="sm" className="text-xs border-border">
            <ArrowLeft className="size-3.5 mr-1.5" /> Voltar para Empresas
          </Button>
        </NextLink>
      </div>
    );
  }

  const nextStatus: CompanyStatus = company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <NextLink
        href="/admin/empresas"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Voltar para lista de empresas
      </NextLink>

      {/* Banner Principal da Empresa */}
      <div className="p-6 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-secondary/80 border border-border flex items-center justify-center font-bold text-foreground text-lg shrink-0">
            {company.tradeName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {company.tradeName}
              </h1>
              <Badge
                variant="outline"
                className={
                  company.status === "ACTIVE"
                    ? "border-primary/40 text-primary bg-primary/10"
                    : company.status === "SUSPENDED"
                      ? "border-destructive/40 text-destructive bg-destructive/10"
                      : "border-border text-muted-foreground"
                }
              >
                {company.status === "ACTIVE"
                  ? "Conta Ativa"
                  : company.status === "SUSPENDED"
                    ? "Operação Suspensa"
                    : "Desativada"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              CNPJ: {company.cnpjMasked} · Razão: {company.legalName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NextLink href={`/admin/empresas/${empresaId}/editar`}>
            <Button variant="outline" size="sm" className="h-9 text-xs border-border gap-1.5">
              <Edit className="size-3.5" />
              Editar Cadastro
            </Button>
          </NextLink>

          <Button
            variant={company.status === "ACTIVE" ? "destructive" : "default"}
            size="sm"
            className="h-9 text-xs gap-1.5 font-medium"
            onClick={() => setStatusDialogOpen(true)}
          >
            {company.status === "ACTIVE" ? (
              <>
                <ShieldAlert className="size-3.5" />
                Suspender Operação
              </>
            ) : (
              <>
                <ShieldCheck className="size-3.5" />
                Reativar Empresa
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid de Metadados Cadastrais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Responsável Legal</span>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground" />
            {company.responsibleName} ({company.roleInCompany})
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">
            CPF: •••.{company.responsibleCpf.slice(3, 6)}.•••-••
          </span>
        </Card>

        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Contatos Oficiais</span>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
            <Mail className="size-3.5 text-muted-foreground shrink-0" />
            {company.responsibleEmail}
          </p>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Phone className="size-3.5 text-muted-foreground shrink-0" />
            {company.responsiblePhone}
          </span>
        </Card>

        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Segmento e Porte</span>
          <p className="text-xs font-semibold text-foreground">
            {company.segment} · Porte {company.companySize} func.
          </p>
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <Globe className="size-3 shrink-0" />
              {company.website}
            </a>
          )}
        </Card>

        <Card className="bg-card border-border p-4 space-y-1">
          <span className="text-[11px] text-muted-foreground">Volume Histórico Total</span>
          <p className="text-sm font-bold font-mono text-foreground">
            {formatCentsToBrl(company.totalVolumeInCents)}
          </p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3 shrink-0" />
            Cadastrada em {new Date(company.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </Card>
      </div>

      {/* Tabs de Conteúdo: Contas, Operações, Políticas, Auditoria */}
      <Tabs defaultValue="contas" className="w-full">
        <TabsList className="bg-card border border-border p-1">
          <TabsTrigger value="contas" className="text-xs gap-1.5">
            <Wallet className="size-3.5" />
            Contas Operacionais ({accountsData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="operacoes" className="text-xs gap-1.5">
            <ArrowDownUp className="size-3.5" />
            Transações Recentes
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="text-xs gap-1.5">
            <History className="size-3.5" />
            Histórico & Auditoria
          </TabsTrigger>
        </TabsList>

        {/* Tab Contas Operacionais */}
        <TabsContent value="contas" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountsData?.data && accountsData.data.length > 0 ? (
              accountsData.data.map((acc) => (
                <Card key={acc.id} className="bg-card border-border">
                  <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-mono">Conta SPI</span>
                      <CardTitle className="text-sm font-mono font-bold text-foreground">
                        {acc.accountNumber}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        acc.status === "ACTIVE"
                          ? "border-primary/40 text-primary"
                          : "border-destructive/40 text-destructive"
                      }
                    >
                      {acc.status === "ACTIVE" ? "Operacional" : "Bloqueada"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Saldo Contabilizado</span>
                        <p className="font-mono font-semibold text-foreground">
                          {formatCentsToBrl(acc.bookBalanceInCents || acc.settledBalanceInCents || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Saldo Disponível</span>
                        <p className="font-mono font-semibold text-primary">
                          {formatCentsToBrl(acc.availableBalanceInCents || acc.currentAvailableBalanceInCents || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Limite Diário SPI</span>
                        <p className="font-mono text-muted-foreground">
                          {formatCentsToBrl(acc.dailyLimitInCents)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Limite Unitário Pix</span>
                        <p className="font-mono text-muted-foreground">
                          {formatCentsToBrl(acc.transactionLimitInCents || acc.maxPerTransactionInCents || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex justify-end">
                      <NextLink href={`/admin/contas/${acc.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs border-border">
                          Ver Detalhes da Conta <ExternalLink className="size-3 ml-1" />
                        </Button>
                      </NextLink>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-8">Nenhuma conta operacional vinculada.</p>
            )}
          </div>
        </TabsContent>

        {/* Tab Transações Recentes */}
        <TabsContent value="operacoes" className="space-y-4 pt-4">
          <Card className="bg-card border-border overflow-hidden">
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
                        <td className="py-3 px-4 font-mono">
                          {tx.direction === "IN" ? (
                            <span className="text-primary font-semibold">ENTRADA</span>
                          ) : (
                            <span className="text-foreground">SAÍDA</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{tx.counterpartyName}</span>
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
                        Nenhuma movimentação registrada no período para esta empresa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab Auditoria */}
        <TabsContent value="auditoria" className="space-y-4 pt-4">
          <Card className="bg-card border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold text-foreground">
              Eventos Administrativos Registrados
            </h3>
            <div className="divide-y divide-border/60">
              {auditData?.data && auditData.data.length > 0 ? (
                auditData.data.map((ev) => (
                  <div key={ev.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{ev.actionType}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por {ev.actorName} ({ev.actorRole}) · Motivo: {ev.reason || "Sem justificativa"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4">Nenhum evento registrado.</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Confirmação de Suspensão/Reativação */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {nextStatus === "SUSPENDED" ? "Suspender Empresa" : "Reativar Empresa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {company.tradeName} ({company.cnpjMasked})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Justificativa Obrigatória de Governança
              </label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Informe o motivo técnico, regulatório ou administrativo para o log de auditoria..."
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
              variant={nextStatus === "SUSPENDED" ? "destructive" : "default"}
              size="sm"
              disabled={statusMutation.isPending || !statusReason.trim()}
              onClick={() =>
                statusMutation.mutate({ status: nextStatus, reason: statusReason })
              }
              className="text-xs font-medium"
            >
              {statusMutation.isPending
                ? "Gravando..."
                : nextStatus === "SUSPENDED"
                  ? "Confirmar Suspensão"
                  : "Confirmar Reativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
