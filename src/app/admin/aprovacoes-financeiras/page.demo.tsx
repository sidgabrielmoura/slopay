"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Layers,
  AlertTriangle,
  UserCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRequest, ApprovalRequestStatus } from "@/types/domain";

export default function AdminAprovacoesFinanceirasPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["admin", "financialApprovals", statusFilter],
    queryFn: () =>
      demoRepository.getFinancialApprovals({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      }),
  });

  const mutation = useMutation({
    mutationFn: async (params: {
      requestId: string;
      decision: "APPROVE" | "REJECT";
      reason: string;
    }) => {
      return demoRepository.decideFinancialApprovalExtraordinary(params);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.decision === "APPROVE"
          ? "Operação aprovada extraordinariamente pelo Superadmin!"
          : "Operação recusada extraordinariamente."
      );
      setSelectedRequest(null);
      setDecisionAction(null);
      setDecisionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "financialApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "operations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "balances"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao processar deliberação extraordinária.");
    },
  });

  const handleOpenDecision = (req: ApprovalRequest, action: "APPROVE" | "REJECT") => {
    setSelectedRequest(req);
    setDecisionAction(action);
    setDecisionReason("");
  };

  const handleConfirmDecision = () => {
    if (!selectedRequest || !decisionAction) return;
    if (!decisionReason.trim()) {
      toast.error("É obrigatório informar a justificativa formal para a auditoria.");
      return;
    }

    mutation.mutate({
      requestId: selectedRequest.id,
      decision: decisionAction,
      reason: decisionReason.trim(),
    });
  };

  const renderStatusBadge = (st: ApprovalRequestStatus) => {
    switch (st) {
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] gap-1">
            <Clock className="size-3" /> Aguardando Alçada
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] gap-1">
            <CheckCircle2 className="size-3" /> Aprovada
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] gap-1">
            <XCircle className="size-3" /> Rejeitada
          </Badge>
        );
    }
  };

  const pendingCount = approvals.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mesa de Alçadas & Aprovações Financeiras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deliberação extraordinária do Superadmin para saques de alto valor e desbloqueio de travas operacionais.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: "PENDING", label: `Pendentes de Alçada (${pendingCount})` },
          { id: "APPROVED", label: "Aprovadas" },
          { id: "REJECTED", label: "Rejeitadas" },
          { id: "ALL", label: "Todas as Solicitações" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === tab.id
                ? "bg-secondary text-foreground font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-card/50 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center space-y-3">
            <ShieldCheck className="size-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              Nenhuma solicitação pendente nesta fila
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Todas as alçadas financeiras e saques de alto valor encontram-se em dia e devidamente deliberados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((req) => (
            <Card
              key={req.id}
              className="bg-card border-border hover:border-border/80 transition-colors"
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {req.id}
                    </span>
                    {renderStatusBadge(req.status)}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-0.5 rounded bg-secondary">
                      {req.operationType === "WITHDRAWAL" ? (
                        <>
                          <ArrowUpRight className="size-3 text-amber-400" /> Saque Direto
                        </>
                      ) : (
                        <>
                          <Layers className="size-3 text-blue-400" /> Lote de Pagamento
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">
                        Solicitante:
                      </span>
                      <span className="font-medium text-foreground">
                        {req.requesterName}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Em {formatDateTime(req.createdAt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">
                        Beneficiário / Chave:
                      </span>
                      <span className="font-medium text-foreground">
                        {req.counterpartyName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        {req.counterpartyKey}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">
                        Quórum de Aprovação:
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        {req.currentApprovalsCount} de {req.requiredApprovals} assinaturas
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Regra: {req.ruleSnapshot?.name || "Padrão de Alçada"}
                      </span>
                    </div>
                  </div>

                  {/* Histórico de Decisões Prévias */}
                  {req.decisions && req.decisions.length > 0 && (
                    <div className="pt-2 border-t border-border/50 text-[11px] space-y-1">
                      <span className="text-muted-foreground font-medium">
                        Histórico de deliberações:
                      </span>
                      {req.decisions.map((dec, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <UserCheck className="size-3 text-primary" />
                          <span className="font-medium text-foreground">{dec.userName}</span>:
                          <span>{dec.decision === "APPROVE" ? "Aprovou" : "Recusou"}</span>
                          {dec.reason && <span className="italic">({dec.reason})</span>}
                          <span className="text-[10px]">às {formatDateTime(dec.decidedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Valor & Ações */}
                <div className="flex flex-col md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <div className="md:text-right">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Valor a Liberar
                    </span>
                    <span className="text-2xl font-bold font-mono text-foreground">
                      {formatCentsToBrl(req.amountInCents)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Tarifa: {formatCentsToBrl(req.feeInCents)}
                    </span>
                  </div>

                  {req.status === "PENDING" && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDecision(req, "REJECT")}
                        className="flex-1 md:flex-none h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenDecision(req, "APPROVE")}
                        className="flex-1 md:flex-none h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 gap-1"
                      >
                        <ShieldCheck className="size-3.5" />
                        Aprovar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Decision Dialog */}
      {selectedRequest && decisionAction && (
        <Dialog
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        >
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                {decisionAction === "APPROVE" ? (
                  <>
                    <ShieldCheck className="size-4 text-emerald-400" />
                    Aprovação Extraordinária de Alçada
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-4 text-red-400" />
                    Recusa Extraordinária de Operação
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Como Superadmin, sua decisão tem efeito imediato e será gravada de forma indelével na trilha de auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-background border border-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operação:</span>
                  <span className="font-mono font-medium text-foreground">
                    {selectedRequest.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCentsToBrl(selectedRequest.amountInCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Favorecido:</span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.counterpartyName}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Justificativa Formal do Superadmin *
                </label>
                <Textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Ex: Liberação autorizada com base na confirmação bancária direta e validação de lastro com o diretor financeiro."
                  rows={3}
                  className="text-xs bg-background border-border text-foreground resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="h-8 text-xs border-border"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={mutation.isPending || !decisionReason.trim()}
                onClick={handleConfirmDecision}
                className={`h-8 text-xs font-semibold ${
                  decisionAction === "APPROVE"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {mutation.isPending
                  ? "Gravando..."
                  : decisionAction === "APPROVE"
                  ? "Confirmar Aprovação"
                  : "Confirmar Recusa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
