"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { useAdminFilters } from "@/features/admin/hooks/use-admin-filters";
import { FileCheck2, ExternalLink, Clock, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { FilterInput, FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminAberturaDeContasPage() {
  const service = useGatewayService();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin_applications", activeTab, search, page],
    queryFn: () =>
      service.getAccountApplications({
        statusTab: activeTab,
        search,
        page,
        pageSize: 10,
      }),
  });

  const tabs = [
    { id: "ALL", label: "Todas" },
    { id: "RECEIVED", label: "Recebidas" },
    { id: "UNDER_REVIEW", label: "Em Análise" },
    { id: "CHANGES_REQUESTED", label: "Ajustes Solicitados" },
    { id: "RESUBMITTED", label: "Reenviadas" },
    { id: "APPROVED", label: "Aprovadas" },
    { id: "REJECTED", label: "Recusadas" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10">Recebida</Badge>;
      case "UNDER_REVIEW":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">Em Análise</Badge>;
      case "CHANGES_REQUESTED":
        return <Badge variant="outline" className="border-orange-500/40 text-orange-400 bg-orange-500/10">Ajuste Solicitado</Badge>;
      case "RESUBMITTED":
        return <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 bg-indigo-500/10">Reenviada</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">Aprovada</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">Recusada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileCheck2 className="size-6 text-primary" />
            Fila de Abertura de Contas (KYC Desk)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Esteira de credenciamento cadastral, validação de titularidade e deferimento operacional.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <FilterSheet value={{ search: search, activeTab }} defaults={{ search: "", activeTab: "ALL" }}
          active={Boolean(search) || activeTab !== "ALL"}
          onApply={draft => { setSearch(draft.search.trim()); setActiveTab(draft.activeTab); setPage(1); }}>
          {(draft, setDraft) => <>
            <FilterInput label="Buscar cadastro" placeholder="Razão social, nome fantasia, CNPJ ou titular" value={draft.search}
              onChange={event => setDraft({ ...draft, search: event.target.value })} />
            <FilterSelect label="Situação" value={draft.activeTab} options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
              onChange={activeTab => setDraft({ ...draft, activeTab })} />
          </>}
        </FilterSheet>
      </div>

      {/* Tabela de Solicitações */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Empresa Solicitante</th>
                <th className="py-3 px-4">CNPJ</th>
                <th className="py-3 px-4">Titular / Cargo</th>
                <th className="py-3 px-4">Segmento</th>
                <th className="py-3 px-4">Analista</th>
                <th className="py-3 px-4">Submissão</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Carregando fila de credenciamento...
                  </td>
                </tr>
              ) : result?.data && result.data.length > 0 ? (
                result.data.map((app) => (
                  <tr key={app.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <NextLink
                          href={`/admin/abertura-de-contas/${app.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                        >
                          {app.tradeName || app.companyName}
                          <ExternalLink className="size-3 opacity-60" />
                        </NextLink>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                          {app.companyName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {app.cnpjMasked}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{app.responsibleName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {app.roleInCompany}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      {app.segment}
                    </td>

                    <td className="py-3.5 px-4">
                      {app.assignedAnalystName ? (
                        <span className="inline-flex items-center gap-1 text-foreground font-medium">
                          <UserCheck className="size-3 text-primary" />
                          {app.assignedAnalystName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Não atribuído</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="size-3 text-muted-foreground" />
                        {new Date(app.submittedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(app.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <NextLink href={`/admin/abertura-de-contas/${app.id}`}>
                        <Button size="sm" className="h-7 text-xs px-3 font-medium">
                          Analisar
                        </Button>
                      </NextLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhuma solicitação encontrada nesta aba.
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
              Página {result.page} de {result.totalPages} ({result.total} solicitações)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                disabled={result.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                disabled={result.page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
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
