"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Webhook,
  Plus,
  RotateCcw,
  Send,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { WebhookConfig } from "@/types/domain";

export function WebhooksListScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<WebhookConfig | null>(null);
  const [testTarget, setTestTarget] = useState<WebhookConfig | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    durationMs: number;
    payload: any;
  } | null>(null);

  const { data: webhooks, isLoading, refetch } = useQuery({
    queryKey: queryKeys.webhooks(),
    queryFn: () => service.getWebhooks(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      service.updateWebhook(id, { active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks() });
      toast.success(
        vars.active ? "Webhook ativado com sucesso." : "Webhook pausado na demonstração."
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar status do webhook.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks() });
      toast.success("Webhook removido com sucesso.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir webhook.");
    },
  });

  const handleTriggerTest = (wh: WebhookConfig) => {
    setTestTarget(wh);
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        status: 200,
        durationMs: 84,
        payload: {
          event: wh.eventType,
          timestamp: new Date().toISOString(),
          data: {
            transactionId: "tx_demo_test_ping_001",
            amountInCents: 15000,
            status: "COMPLETED",
            endToEndId: "E0036030520260916TEST001",
          },
        },
      });
      toast.success("Disparo de teste simulado com entrega HTTP 200 OK!");
    }, 600);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  const getEventBadge = (type: WebhookConfig["eventType"]) => {
    switch (type) {
      case "PIX_RECEIVED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">Pix Recebido</Badge>;
      case "PIX_SENT":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">Pix Enviado</Badge>;
      case "APPROVAL_REQUIRED":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">Aprovação Pendente</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Webhooks & Notificações HTTP
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Integre seus sistemas de backend recebendo eventos instantâneos com assinatura e retentativas automáticas.
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
          <Button asChild size="sm" className="gap-1.5 font-semibold">
            <NextLink href="/integracoes/webhooks/novo">
              <Plus className="size-4" />
              <span>Novo Endpoint</span>
            </NextLink>
          </Button>
        </div>
      </div>

      {/* Info Card de Assinatura */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <Code2 className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Segurança & Assinatura Criptográfica HMAC-SHA256
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Todas as requisições enviadas pela SloPay acompanham o header{" "}
                <code className="px-1 py-0.5 rounded bg-muted text-primary font-mono text-[11px]">
                  X-SloPay-Signature
                </code>{" "}
                para validação de integridade no seu servidor.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-center font-mono shrink-0">
            Tempo limite: 5000ms
          </Badge>
        </CardContent>
      </Card>

      {/* Tabela de Endpoints */}
      <Card className="border-border bg-card/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !webhooks || webhooks.length === 0 ? (
          <div className="p-8">
            <Empty
              title="Nenhum webhook cadastrado"
              description="Configure seu primeiro endpoint HTTP para receber eventos Pix em tempo real."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento Assinado</TableHead>
                <TableHead>URL de Destino (HTTPS)</TableHead>
                <TableHead>Retentativas</TableHead>
                <TableHead>Headers Customizados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell>
                    {getEventBadge(wh.eventType)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 max-w-sm">
                      <span className="font-mono text-xs text-foreground truncate" title={wh.url}>
                        {wh.url}
                      </span>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => copyUrl(wh.url)}
                        title="Copiar URL"
                        className="shrink-0"
                      >
                        <Copy className="size-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={wh.retryEnabled ? "outline" : "secondary"} className="text-[10px]">
                      {wh.retryEnabled ? "Até 5x com backoff" : "Sem retentativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {wh.headers?.length || 0} definidos
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={wh.active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: wh.id, active: checked })
                        }
                        disabled={toggleActiveMutation.isPending}
                      />
                      <span className="text-xs text-muted-foreground">
                        {wh.active ? "Ativo" : "Pausado"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => handleTriggerTest(wh)}
                        title="Disparar teste de webhook"
                      >
                        <Send className="size-3.5 text-primary hover:text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => router.push(`/integracoes/webhooks/${wh.id}`)}
                        title="Editar endpoint"
                      >
                        <Edit className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => setDeleteTarget(wh)}
                        title="Remover endpoint"
                      >
                        <Trash2 className="size-3.5 text-destructive hover:text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal de Disparo de Teste */}
      <Dialog open={!!testTarget} onOpenChange={(open) => !open && setTestTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-primary" />
              Disparo de Teste do Webhook
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulação de envio de payload HTTP POST para o endpoint configurado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-background/80 border border-border space-y-1 font-mono">
              <p className="text-muted-foreground text-[11px]">POST {testTarget?.url}</p>
              <p className="text-muted-foreground text-[11px]">
                X-SloPay-Signature: 8f2b3e8c9a1d... (HMAC-SHA256)
              </p>
            </div>

            {isTesting ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground">Enviando requisição de teste...</span>
              </div>
            ) : testResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4" />
                    <span>Resposta: HTTP {testResult.status} OK</span>
                  </div>
                  <span className="font-mono text-[11px]">{testResult.durationMs}ms</span>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Corpo do Payload Enviado:</span>
                  <pre className="p-3 rounded-lg bg-background border border-border font-mono text-[11px] text-foreground overflow-x-auto">
                    {JSON.stringify(testResult.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestTarget(null)}
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={() => testTarget && handleTriggerTest(testTarget)}
              disabled={isTesting}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              <span>Testar Novamente</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Endpoint de Webhook?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Seus servidores deixarão de receber notificações instantâneas para o evento &ldquo;{deleteTarget?.eventType}&rdquo; na URL {deleteTarget?.url}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
