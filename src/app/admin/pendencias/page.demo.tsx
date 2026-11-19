"use client";

import React from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import {
  AlertOctagon,
  FileCheck2,
  ShieldAlert,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCentsToBrl } from "@/lib/money";

export default function AdminPendenciasPage() {
  const service = useGatewayService();

  const { data: applications, isLoading: loadingApps } = useQuery({
    queryKey: ["admin_applications_pending"],
    queryFn: () => service.getAccountApplications({ pageSize: 20 }),
  });

  const { data: approvals, isLoading: loadingApprovals } = useQuery({
    queryKey: ["admin_approvals_pending"],
    queryFn: () => service.getFinancialApprovals({ status: "PENDING" }),
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ["admin_companies_suspended"],
    queryFn: () => service.getCompanies({ status: "SUSPENDED" }),
  });

  // Filtra as solicitações que requerem ação do analista
  const urgentApps = (applications?.data || []).filter(
    (a) => a.status === "RECEIVED" || a.status === "UNDER_REVIEW" || a.status === "RESUBMITTED"
  );
  const waitingClientApps = (applications?.data || []).filter(
    (a) => a.status === "CHANGES_REQUESTED"
  );
  const pendingApprovals = approvals || [];
  const suspendedComps = companies?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <AlertOctagon className="size-6 text-destructive" />
          Fila Central de Pendências
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Demandas com SLA prioritário de KYC, aprovações de tesouraria e alertas de compliance.
        </p>
      </div>

      {/* Grid de Blocos de Pendência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 1: Aberturas de Conta Aguardando Decisão */}
        <Card className="bg-card border-border">
          <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileCheck2 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Solicitações de Credenciamento ({urgentApps.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Aguardando análise documental e parecer
                </CardDescription>
              </div>
            </div>
            <NextLink href="/admin/abertura-de-contas">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Ver fila completa <ArrowRight className="size-3 ml-1" />
              </Button>
            </NextLink>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {urgentApps.length > 0 ? (
              urgentApps.map((app) => (
                <div key={app.id} className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {app.companyName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      CNPJ: {app.cnpjMasked} · Titular: {app.responsibleName}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 border-border">
                        {app.status === "RECEIVED"
                          ? "Nova Entrada"
                          : app.status === "RESUBMITTED"
                            ? "Reenviada pelo Cliente"
                            : "Em Análise"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(app.submittedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <NextLink href={`/admin/abertura-de-contas/${app.id}`}>
                    <Button size="sm" className="h-8 text-xs font-medium shrink-0">
                      Analisar
                    </Button>
                  </NextLink>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="size-5 text-primary mx-auto mb-2" />
                Nenhuma solicitação pendente no momento.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 2: Aprovações Financeiras Extraordinárias */}
        <Card className="bg-card border-border">
          <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <ShieldAlert className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Aprovações Extraordinárias ({pendingApprovals.length})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Saques e transferências retidas por quórum ou alçada
                </CardDescription>
              </div>
            </div>
            <NextLink href="/admin/aprovacoes-financeiras">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Mesa de decisão <ArrowRight className="size-3 ml-1" />
              </Button>
            </NextLink>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {req.counterpartyName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Chave: {req.counterpartyKey} · Solicitante: {req.requesterName}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {formatCentsToBrl(req.totalInCents)}
                      </span>
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {req.operationType === "BATCH" ? "Lote Pix" : "Saque Único"}
                      </Badge>
                    </div>
                  </div>

                  <NextLink href="/admin/aprovacoes-financeiras">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-border shrink-0">
                      Decidir
                    </Button>
                  </NextLink>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="size-5 text-primary mx-auto mb-2" />
                Nenhum saque retido aguardando alçada.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3: Ajustes Aguardando Resposta do Cliente */}
        <Card className="bg-card border-border">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Ajustes Cadastrais em Aberto ({waitingClientApps.length})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Solicitações onde a equipe pediu correção documental ou dados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {waitingClientApps.length > 0 ? (
              waitingClientApps.map((app) => (
                <div key={app.id} className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {app.companyName}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      Instrução: {app.clientInstructions || "Ajuste de comprovantes pendente."}
                    </p>
                  </div>
                  <NextLink href={`/admin/abertura-de-contas/${app.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border shrink-0">
                      Ver Histórico
                    </Button>
                  </NextLink>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Nenhum processo aguardando retorno do titular.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bloco 4: Empresas Suspensas / Investigação de Compliance */}
        <Card className="bg-card border-border">
          <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-destructive" />
                Empresas Suspensas ({suspendedComps.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Bloqueio operacional ativo decorrente de risco ou MED
              </CardDescription>
            </div>
            <NextLink href="/admin/empresas">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Ver empresas <ArrowRight className="size-3 ml-1" />
              </Button>
            </NextLink>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {suspendedComps.length > 0 ? (
              suspendedComps.map((comp) => (
                <div key={comp.id} className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/20">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">
                      {comp.tradeName} ({comp.legalName})
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      CNPJ: {comp.cnpjMasked}
                    </span>
                    {comp.suspensionReason && (
                      <p className="text-[11px] text-destructive/90 mt-1 line-clamp-1">
                        Motivo: {comp.suspensionReason}
                      </p>
                    )}
                  </div>
                  <NextLink href={`/admin/empresas/${comp.id}`}>
                    <Button variant="outline" size="sm" className="h-8 text-xs border-border shrink-0">
                      Gerenciar
                    </Button>
                  </NextLink>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Nenhuma empresa sob bloqueio preventivo no momento.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
