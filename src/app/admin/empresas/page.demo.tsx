"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { useAdminFilters } from "@/features/admin/hooks/use-admin-filters";
import { AdminFilterBar } from "@/features/admin/components/filters/admin-filter-bar";
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Edit,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
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
import type { Company, CompanyStatus } from "@/types/domain";

export default function AdminEmpresasPage() {
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const {
    filters,
    setSearch,
    setPeriod,
    setStatus,
    setPage,
    resetFilters,
  } = useAdminFilters({ defaultDateField: "Data de Credenciamento" });

  const [statusDialogTarget, setStatusDialogTarget] = useState<{
    company: Company;
    nextStatus: CompanyStatus;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin_companies", filters],
    queryFn: () => service.getCompanies(filters),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      companyId,
      status,
      reason,
    }: {
      companyId: string;
      status: CompanyStatus;
      reason: string;
    }) => {
      return service.setCompanyStatus(companyId, status, reason);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin_global_metrics"] });
      toast.success(
        `Status de ${updated.tradeName} atualizado para ${
          updated.status === "SUSPENDED" ? "SUSPENSA" : "ATIVA"
        }.`
      );
      setStatusDialogTarget(null);
      setStatusReason("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao alterar status da empresa.");
    },
  });

  const handleConfirmStatusChange = () => {
    if (!statusDialogTarget) return;
    if (!statusReason.trim()) {
      toast.error("Informe a justificativa operacional/regulatória.");
      return;
    }
    statusMutation.mutate({
      companyId: statusDialogTarget.company.id,
      status: statusDialogTarget.nextStatus,
      reason: statusReason,
    });
  };

  const statusOptions = [
    { value: "ALL", label: "Todas" },
    { value: "ACTIVE", label: "Ativas" },
    { value: "SUSPENDED", label: "Suspensas" },
    { value: "DEACTIVATED", label: "Desativadas" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="size-6 text-primary" />
            Empresas Credenciadas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão cadastral, contas vinculadas, governança e conformidade das empresas clientes.
          </p>
        </div>

        <NextLink href="/admin/abertura-de-contas">
          <Button size="sm" className="h-9 text-xs font-medium">
            Ver Fila de Abertura
          </Button>
        </NextLink>
      </div>

      {/* Barra de Filtros Unificada */}
      <AdminFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onPeriodChange={setPeriod}
        onStatusChange={setStatus}
        onReset={resetFilters}
        statusOptions={statusOptions}
        dateFieldLabel="Data de Cadastro"
        searchPlaceholder="Buscar por Razão Social, Fantasia, CNPJ ou Titular..."
        showCompanyFilter={false}
        showAccountFilter={false}
      />

      {/* Tabela de Empresas */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Empresa / Credenciado</th>
                <th className="py-3 px-4">CNPJ</th>
                <th className="py-3 px-4">Responsável Legal</th>
                <th className="py-3 px-4">Contas</th>
                <th className="py-3 px-4 text-right">Volume Acumulado</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Carregando empresas cadastradas...
                  </td>
                </tr>
              ) : result?.data && result.data.length > 0 ? (
                result.data.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <NextLink
                          href={`/admin/empresas/${c.id}`}
                          className="font-semibold text-foreground hover:underline hover:text-primary transition-colors inline-flex items-center gap-1.5"
                        >
                          {c.tradeName}
                          <ExternalLink className="size-3 opacity-60" />
                        </NextLink>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                          {c.legalName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {c.cnpjMasked}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{c.responsibleName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.roleInCompany} · {c.responsiblePhone}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-foreground font-medium">
                        {c.activeAccountCount}/{c.accountCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCentsToBrl(c.totalVolumeInCents)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={
                          c.status === "ACTIVE"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : c.status === "SUSPENDED"
                            ? "border-destructive/40 text-destructive bg-destructive/10"
                            : "border-border text-muted-foreground"
                        }
                      >
                        {c.status === "ACTIVE"
                          ? "Ativa"
                          : c.status === "SUSPENDED"
                          ? "Suspensa"
                          : "Desativada"}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <NextLink href={`/admin/empresas/${c.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 border-border">
                            Ver
                          </Button>
                        </NextLink>

                        <NextLink href={`/admin/empresas/${c.id}/editar`}>
                          <Button variant="ghost" size="sm" className="h-7 size-7 p-0 text-muted-foreground hover:text-foreground">
                            <Edit className="size-3.5" />
                          </Button>
                        </NextLink>

                        {c.status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setStatusDialogTarget({ company: c, nextStatus: "SUSPENDED" })
                            }
                            className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                          >
                            Suspender
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setStatusDialogTarget({ company: c, nextStatus: "ACTIVE" })
                            }
                            className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                          >
                            Reativar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhuma empresa localizada com os filtros informados.
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
              Página {result.page} de {result.totalPages} ({result.total} empresas)
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

      {/* Modal de Confirmação de Suspensão / Reativação com Motivo Obrigatório */}
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
                ? "Confirmar Suspensão Operacional"
                : "Confirmar Reativação da Empresa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {statusDialogTarget?.company.tradeName} ({statusDialogTarget?.company.cnpjMasked})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {statusDialogTarget?.nextStatus === "SUSPENDED"
                ? "A suspensão bloqueará imediatamente a liquidação Pix de todas as contas operacionais vinculadas a esta empresa. Todas as ações ficam registradas na trilha de auditoria imutável."
                : "A reativação restaurará a capacidade de emissão e liquidação Pix das contas operacionais da empresa."}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Justificativa Obrigatória (Auditoria / Compliance)
              </label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Informe o número do chamado, relatório de risco, ofício do Bacen ou motivo detalhado..."
                rows={3}
                className="text-xs bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
              onClick={handleConfirmStatusChange}
              disabled={statusMutation.isPending || !statusReason.trim()}
              className="text-xs"
            >
              {statusMutation.isPending
                ? "Gravando..."
                : statusDialogTarget?.nextStatus === "SUSPENDED"
                ? "Confirmar Suspensão"
                : "Reativar Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
