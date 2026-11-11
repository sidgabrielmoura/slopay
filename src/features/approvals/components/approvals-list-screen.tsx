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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  User,
} from "lucide-react";

export function ApprovalsListScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { hideValues } = usePreferences();

  const [tab, setTab] = useState<"PENDING" | "RESOLVED">("PENDING");

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.approvals(tab === "PENDING" ? "PENDING" : undefined),
    queryFn: () => service.getApprovals(tab === "PENDING" ? "PENDING" : undefined),
  });

  const approvals = data?.data.filter((a) =>
    tab === "PENDING" ? a.status === "PENDING" : a.status !== "PENDING"
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Fila de Aprovações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Governança corporativa e liberação de saques e lotes sob alçada.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5 w-fit"
        >
          <RotateCcw className="size-3.5" />
          <span>Atualizar Fila</span>
        </Button>
      </div>

      {/* Abas com contador */}
      <div className="flex border-b border-border gap-6 text-sm font-medium">
        <button
          onClick={() => setTab("PENDING")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            tab === "PENDING"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Pendentes</span>
          {data?.pendingCount !== undefined && data.pendingCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {data.pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab("RESOLVED")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            tab === "RESOLVED"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Histórico Concluído</span>
        </button>
      </div>

      <Card className="border-border bg-card/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-8">
            <Empty
              title={
                tab === "PENDING"
                  ? "Nenhuma solicitação pendente"
                  : "Nenhuma solicitação concluída no histórico"
              }
              description={
                tab === "PENDING"
                  ? "Todas as operações corporativas estão liberadas ou liquidadas."
                  : "Não há registros de decisões passadas."
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data da Solicitação</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Destino / Favorecido</TableHead>
                <TableHead>Quórum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => router.push(`/aprovacoes/${app.id}`)}
                >
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatDateTime(app.createdAt, "short")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {app.operationType === "WITHDRAWAL" ? "Saque Único" : "Saque em Lote"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {app.requesterName}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col max-w-[200px]">
                      <span className="text-sm font-medium text-foreground truncate">
                        {app.counterpartyName}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {app.counterpartyKey}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    {app.currentApprovalsCount} de {app.requiredApprovals} votos
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        app.status === "APPROVED"
                          ? "success"
                          : app.status === "PENDING"
                          ? "warning"
                          : "destructive"
                      }
                      className="text-[10px]"
                    >
                      {app.status === "APPROVED"
                        ? "Aprovado"
                        : app.status === "PENDING"
                        ? "Pendente"
                        : "Recusado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold tabular-nums text-foreground">
                    {formatCentsToBrl(app.totalInCents, { hideValue: hideValues })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary font-medium"
                    >
                      <span>Avaliar</span>
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
