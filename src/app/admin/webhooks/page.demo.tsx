"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
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
  Webhook,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Zap,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { WebhookConfig } from "@/types/domain";

export default function AdminWebhooksPage() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["admin", "webhooks"],
    queryFn: () => demoRepository.getWebhooks(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (wh: WebhookConfig) => {
      return demoRepository.updateWebhook(wh.id, { active: !wh.active });
    },
    onSuccess: (updated) => {
      toast.success(
        `Webhook ${updated.url} ${updated.active ? "ativado" : "pausado"}!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });

  const handleTestPing = (wh: WebhookConfig) => {
    setTestingId(wh.id);
    toast.loading(`Disparando evento de teste para ${wh.url}...`, { id: "test-webhook" });

    setTimeout(() => {
      setTestingId(null);
      toast.dismiss("test-webhook");
      toast.success(`Webhook respondeu com HTTP 200 OK (Latência: 114ms).`);
    }, 800);
  };

  const renderEventBadge = (evt: string) => {
    switch (evt) {
      case "PIX_RECEIVED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
            PIX_RECEIVED (Entrada)
          </Badge>
        );
      case "PIX_SENT":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
            PIX_SENT (Saída)
          </Badge>
        );
      case "APPROVAL_REQUIRED":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px]">
            APPROVAL_REQUIRED
          </Badge>
        );
      default:
        return <Badge variant="outline">{evt}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Monitoramento de Webhooks & Integrações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Supervisão de endpoints cadastrados, saúde de entrega e logs de retry do ecossistema de APIs.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Endpoints Registrados
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
              {webhooks.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Taxa Global de Sucesso
            </span>
            <div className="text-xl font-bold tracking-tight text-emerald-400 mt-1 font-mono">
              99.82%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Latência Média de Resposta
            </span>
            <div className="text-xl font-bold tracking-tight text-primary mt-1 font-mono">
              128 ms
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">
              Retentativas em 24h
            </span>
            <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
              14
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  URL do Endpoint
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Evento Assinado
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Retentativas
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Headers Custom
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Data de Cadastro
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7} className="h-12 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : webhooks.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhum webhook registrado na SloPay.
                  </TableCell>
                </TableRow>
              ) : (
                webhooks.map((wh) => (
                  <TableRow
                    key={wh.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-foreground break-all">
                          {wh.url}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {wh.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{renderEventBadge(wh.eventType)}</TableCell>
                    <TableCell>
                      {wh.retryEnabled ? (
                        <span className="text-xs text-emerald-400 font-medium">
                          Ativado (5 retries)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Desativado</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {wh.headers?.length || 0} configurados
                    </TableCell>
                    <TableCell>
                      {wh.active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border border-border text-[11px]">
                          Pausado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(wh.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={testingId === wh.id}
                          onClick={() => handleTestPing(wh)}
                          className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                        >
                          <Zap className="size-3.5" /> Testar Ping
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActiveMutation.mutate(wh)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {wh.active ? "Pausar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
