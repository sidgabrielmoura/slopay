"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { ToastNotice } from "@/components/ui/toast-notice";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function ApprovalDetailScreen({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();
  const queryClient = useQueryClient();
  const { hideValues } = usePreferences();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [decisionApprover, setDecisionApprover] = useState<{ id: string; name: string } | null>(null);

  const { data: approval, isLoading, isError } = useQuery({
    queryKey: queryKeys.approval(approvalId),
    queryFn: () => service.getApprovalById(approvalId),
  });

  const decideMutation = useMutation({
    mutationFn: (params: { decision: "APPROVE" | "REJECT"; reason?: string }) => {
      if (isReadOnly || !decisionApprover) {
        throw new Error("Perfil de apenas consulta não possui permissão para aprovar ou recusar operações.");
      }
      return service.decideApproval({
        requestId: approvalId,
        approverId: decisionApprover.id,
        decision: params.decision,
        reason: params.reason,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approval(approvalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.account() });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });

      if (updated.status === "APPROVED") {
        toast.success("Aprovação registrada! A operação foi concluída e liquidada.");
      } else if (updated.status === "REJECTED") {
        toast.error("Solicitação recusada. A reserva de saldo foi cancelada.");
      } else {
        toast.info("Voto registrado com sucesso na fila de aprovação.");
      }

      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.approval(approvalId) });
      toast.error(error.message || "Erro ao registrar decisão.");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !approval) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Empty
          title="Aprovação não encontrada"
          description={`A solicitação "${approvalId}" não foi localizada.`}
          action={
            <Button asChild variant="outline">
              <NextLink href="/aprovacoes">Voltar à Fila</NextLink>
            </Button>
          }
        />
      </div>
    );
  }

  const isPending = approval.status === "PENDING";
  const nextApprover = approval.nextApprover;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/aprovacoes")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar à Fila de Aprovações</span>
        </Button>

        <Badge
          variant={
            approval.status === "APPROVED"
              ? "success"
              : isPending
                ? "warning"
                : "destructive"
          }
          className="text-xs px-3 py-1"
        >
          {approval.status === "APPROVED"
            ? "Aprovado e Liquidado"
            : isPending
              ? "Aguardando Decisão"
              : "Recusado"}
        </Badge>
      </div>

      {/* Resumo da Operação Sob Alçada */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Solicitação #{approval.id}
              </span>
              <CardTitle className="text-xl font-bold text-foreground mt-0.5">
                {approval.operationType === "WITHDRAWAL"
                  ? "Saque Direto Pix"
                  : "Saque Corporativo em Lote"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Solicitado por <strong>{approval.requesterName}</strong> em{" "}
                {formatDateTime(approval.createdAt, "medium")}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-muted-foreground">Valor Total Retido</span>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {formatCentsToBrl(approval.totalInCents, { hideValue: hideValues })}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <span className="text-xs text-muted-foreground">Favorecido / Destino</span>
              <p className="text-sm font-semibold text-foreground">
                {approval.counterpartyName}
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {approval.counterpartyKey}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Regra Aplicada</span>
              <p className="text-sm font-semibold text-foreground">
                {approval.ruleSnapshot.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exige {approval.requiredApprovals} aprovações ({approval.ruleSnapshot.ruleType === "PARALLEL" ? "Paralela" : "Sequencial"})
              </p>
            </div>

            <div className="pt-2 border-t border-border/40 sm:col-span-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Valor Principal: {formatCentsToBrl(approval.amountInCents, { hideValue: hideValues })}</span>
              <span className="text-muted-foreground">Tarifa Pix: {formatCentsToBrl(approval.feeInCents, { hideValue: hideValues })}</span>
            </div>
          </div>

          {/* Histórico de Decisões */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico de Votação ({approval.currentApprovalsCount} de {approval.requiredApprovals} necessários)
            </h3>

            {approval.decisions.length === 0 ? (
              <p className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                Nenhum voto registrado até o momento.
              </p>
            ) : (
              <div className="space-y-2">
                {approval.decisions.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground">
                        {d.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{d.userName}</p>
                        {d.reason && (
                          <p className="text-muted-foreground italic">&ldquo;{d.reason}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={d.decision === "APPROVE" ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {d.decision === "APPROVE" ? "Aprovou" : "Recusou"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {formatDateTime(d.decidedAt, "short")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações de Decisão para o Aprovador */}
          {isPending && (
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
              {isReadOnly ? (
                <ToastNotice variant="warning" message="A votação está desabilitada no perfil de consulta." persistent />
              ) : !nextApprover ? (
                <div className="p-3 w-full rounded-xl bg-muted/50 border border-border text-xs text-center text-muted-foreground">
                  Nenhum aprovador está disponível para esta etapa da regra.
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setDecisionApprover(nextApprover); setRejectDialogOpen(true); }}
                    className="flex-1 text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10 gap-2"
                  >
                    <XCircle className="size-4" />
                    <span>Recusar Operação</span>
                  </Button>
                  <Button
                    onClick={() => { setDecisionApprover(nextApprover); setApproveDialogOpen(true); }}
                    className="flex-1 font-semibold gap-2"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Aprovar Operação</span>
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Aprovação */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação da Operação</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre a aprovação simulada de <strong>{decisionApprover?.name}</strong> para o débito de{" "}
              <strong className="text-foreground"><PanelAmount cents={approval.totalInCents} /></strong> a{" "}
              <strong className="text-foreground">{approval.counterpartyName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Se este for o último voto exigido pelo quórum ({approval.requiredApprovals} votos), a transferência Pix será liquidada imediatamente.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => decideMutation.mutate({ decision: "APPROVE" })}
              disabled={decideMutation.isPending}
              className="gap-2 font-semibold"
            >
              {decideMutation.isPending ? (
                <LoadingIndicator />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              <span>Confirmar Aprovação</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recusa com Justificativa Obrigatória */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Recusar Operação Pix</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre a recusa simulada de <strong>{decisionApprover?.name}</strong>. A operação será cancelada e a reserva será liberada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Motivo da Recusa *
            </label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da não aprovação..."
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                decideMutation.mutate({
                  decision: "REJECT",
                  reason: rejectReason.trim(),
                })
              }
              disabled={!rejectReason.trim() || decideMutation.isPending}
              className="gap-2 font-semibold"
            >
              {decideMutation.isPending ? (
                <LoadingIndicator />
              ) : (
                <XCircle className="size-4" />
              )}
              <span>Confirmar Recusa</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
