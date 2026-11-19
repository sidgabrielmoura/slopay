"use client";

import React, { use, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import {
  FileCheck2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Check,
  X,
  Sliders,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { AccountApplication } from "@/types/domain";

export default function AdminAberturaDeContaReviewPage({ params }: { params: Promise<{ solicitacaoId: string }> }) {
  const { solicitacaoId } = use(params);
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();

  // Dialog States
  const [adjustmentsDialogOpen, setAdjustmentsDialogOpen] = useState(false);
  const [selectedAdjustmentFields, setSelectedAdjustmentFields] = useState<string[]>([]);
  const [adjustmentInstructions, setAdjustmentInstructions] = useState("");

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [selectedPricingPolicy, setSelectedPricingPolicy] = useState("price-global");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const { data: application, isLoading } = useQuery({
    queryKey: ["admin_application_detail", solicitacaoId],
    queryFn: () => service.getApplicationById(solicitacaoId),
  });

  const { data: pricingPolicies } = useQuery({
    queryKey: ["admin_pricing_policies"],
    queryFn: () => service.getPricingPolicies(),
  });

  // Mutações
  const assignMutation = useMutation({
    mutationFn: async () => {
      return service.assignAnalyst(solicitacaoId, "admin-01", "Gabriel Santos");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_application_detail", solicitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      toast.success("Você assumiu formalmente a análise deste credenciamento.");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao assumir análise."),
  });

  const adjustmentsMutation = useMutation({
    mutationFn: async () => {
      if (selectedAdjustmentFields.length === 0) {
        throw new Error("Selecione pelo menos um campo ou documento a ser corrigido.");
      }
      if (!adjustmentInstructions.trim()) {
        throw new Error("Informe a orientação clara que será exibida ao cliente.");
      }
      return service.requestApplicationAdjustments({
        applicationId: solicitacaoId,
        fields: selectedAdjustmentFields,
        instructions: adjustmentInstructions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_application_detail", solicitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      toast.success("Solicitação de ajustes enviada. O titular foi notificado.");
      setAdjustmentsDialogOpen(false);
      setSelectedAdjustmentFields([]);
      setAdjustmentInstructions("");
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao solicitar ajustes."),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return service.approveApplication({
        applicationId: solicitacaoId,
        internalNotes: approvalNotes,
        pricingPolicyId: selectedPricingPolicy,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin_application_detail", solicitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_accounts_list"] });
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      toast.success(
        `Conta ${res.createdAccount.accountNumber} criada e deferida com sucesso!`
      );
      setApproveDialogOpen(false);
      setApprovalNotes("");
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao aprovar conta."),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectionReason.trim()) {
        throw new Error("Informe o parecer técnico de recusa.");
      }
      return service.rejectApplication({
        applicationId: solicitacaoId,
        reason: rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_application_detail", solicitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      toast.success("Solicitação de abertura indeferida.");
      setRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao recusar solicitação."),
  });

  const reopenMutation = useMutation({
    mutationFn: async () => {
      if (!reopenReason.trim()) throw new Error("Informe a justificativa de reabertura.");
      return service.reopenApplication({
        applicationId: solicitacaoId,
        reason: reopenReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_application_detail", solicitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["admin_applications"] });
      toast.success("Processo reaberto para reavaliação de compliance.");
      setReopenDialogOpen(false);
      setReopenReason("");
    },
    onError: (err: any) => toast.error(err?.message || "Falha ao reabrir processo."),
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground">
        Carregando solicitação de credenciamento...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Solicitação não encontrada.</p>
        <NextLink href="/admin/abertura-de-contas">
          <Button variant="outline" size="sm" className="text-xs border-border">
            Voltar para Fila
          </Button>
        </NextLink>
      </div>
    );
  }

  const toggleField = (field: string) => {
    if (selectedAdjustmentFields.includes(field)) {
      setSelectedAdjustmentFields(selectedAdjustmentFields.filter((f) => f !== field));
    } else {
      setSelectedAdjustmentFields([...selectedAdjustmentFields, field]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10">Nova Entrada</Badge>;
      case "UNDER_REVIEW":
        return <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">Em Análise</Badge>;
      case "CHANGES_REQUESTED":
        return <Badge variant="outline" className="border-orange-500/40 text-orange-400 bg-orange-500/10">Ajuste Solicitado</Badge>;
      case "RESUBMITTED":
        return <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 bg-indigo-500/10">Reenviada</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">Conta Aprovada</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">Indeferida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <NextLink
        href="/admin/abertura-de-contas"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Voltar para Fila de Abertura
      </NextLink>

      {/* Header do Dossiê */}
      <div className="p-6 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <FileCheck2 className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {application.tradeName || application.companyName}
              </h1>
              {getStatusBadge(application.status)}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              CNPJ: {application.cnpjMasked} · Protocolo: #{application.id}
            </p>
            {application.assignedAnalystName && (
              <p className="text-[11px] text-muted-foreground">
                Analista responsável:{" "}
                <span className="text-foreground font-medium">
                  {application.assignedAnalystName}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Barra de Ações Decisórias */}
        <div className="flex items-center gap-2 flex-wrap">
          {application.status === "RECEIVED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
              className="h-9 text-xs border-border gap-1.5"
            >
              Assumir Análise
            </Button>
          )}

          {application.status !== "APPROVED" && application.status !== "REJECTED" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdjustmentsDialogOpen(true)}
                className="h-9 text-xs border-orange-500/40 text-orange-400 hover:bg-orange-500/10 gap-1.5"
              >
                Solicitar Ajustes
              </Button>

              <Button
                size="sm"
                onClick={() => setApproveDialogOpen(true)}
                className="h-9 text-xs font-semibold gap-1.5"
              >
                <Check className="size-3.5" />
                Aprovar Conta
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejectDialogOpen(true)}
                className="h-9 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <X className="size-3.5" />
                Recusar
              </Button>
            </>
          )}

          {application.status === "REJECTED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReopenDialogOpen(true)}
              className="h-9 text-xs border-border gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Reabrir Processo
            </Button>
          )}
        </div>
      </div>

      {/* Grid Principal: Dossiê de Dados (Esquerda) vs Histórico / Timeline (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Dados do Dossiê */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Dados do Titular */}
          <Card className="bg-card border-border">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="size-4 text-primary" />
                Titular / Representante Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px]">Nome Completo</span>
                <p className="font-medium text-foreground mt-0.5">{application.responsibleName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">CPF do Titular</span>
                <p className="font-mono text-foreground mt-0.5">
                  {application.responsibleCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Qualificação / Cargo</span>
                <p className="text-foreground mt-0.5">{application.roleInCompany}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Telefone de Contato</span>
                <p className="text-foreground mt-0.5">{application.responsiblePhone}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground text-[11px]">E-mail Corporativo</span>
                <p className="text-foreground mt-0.5">{application.responsibleEmail}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Dados da Empresa */}
          <Card className="bg-card border-border">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Dados Cadastrais da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px]">Razão Social</span>
                <p className="font-medium text-foreground mt-0.5">{application.companyName}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Nome Fantasia</span>
                <p className="font-medium text-foreground mt-0.5">
                  {application.tradeName || "Não informado"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">CNPJ</span>
                <p className="font-mono text-foreground mt-0.5">{application.cnpjMasked}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Segmento Operacional</span>
                <p className="text-foreground mt-0.5">{application.segment}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Porte da Empresa</span>
                <p className="text-foreground mt-0.5">{application.companySize} funcionários</p>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px]">Website Oficial</span>
                <p className="text-foreground mt-0.5">
                  {application.website ? (
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {application.website}
                    </a>
                  ) : (
                    "Não informado"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Checklist de KYC e Conformidade */}
          <Card className="bg-card border-border">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Checklist Automatizado de KYC / Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Completude dos dados cadastrais obrigatórios</span>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  100% Preenchido
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Consulta de idoneidade e quadro societário (QSA)</span>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  Regular
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Validação de CNAE para atividade financeira Pix</span>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  Compatível
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Aceite de Termos de Uso e Política de Risco</span>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  Concluído
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Timeline de Histórico e Notas Internas */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                Linha do Tempo do Processo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="relative border-l border-border/80 ml-3 space-y-5">
                {application.history && application.history.length > 0 ? (
                  application.history.map((h) => (
                    <div key={h.id} className="relative pl-5 text-xs space-y-1">
                      <div className="absolute -left-1.5 top-1 size-3 rounded-full bg-primary border-2 border-card" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{h.action}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(h.timestamp).toLocaleDateString("pt-BR")}{" "}
                          {new Date(h.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {h.description}
                      </p>
                      <span className="text-[10px] text-muted-foreground/80 italic">
                        Por {h.actorName}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground pl-4">Nenhum evento registrado.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notas Internas da Mesa */}
          <Card className="bg-card border-border p-5 space-y-2">
            <span className="text-xs font-semibold text-foreground">Notas Internas da Mesa</span>
            <p className="text-xs text-muted-foreground leading-relaxed bg-background/50 p-3 rounded-lg border border-border">
              {application.internalNotes || "Nenhuma anotação técnica registrada pela mesa."}
            </p>
          </Card>
        </div>
      </div>

      {/* MODAL: Solicitar Ajustes */}
      <Dialog open={adjustmentsDialogOpen} onOpenChange={setAdjustmentsDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Solicitar Ajustes Cadastrais
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A solicitação retornará para o cliente com instruções detalhadas na tela de acompanhamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <label className="font-medium text-foreground">
                Selecione os campos ou documentos que necessitam de correção:
              </label>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {[
                  "Comprovante de Endereço Comercial",
                  "Contrato Social Consolidado",
                  "Procuração ou Ata de Eleição",
                  "Documento de Identificação do Responsável",
                  "Adequação de CNAE na Receita Federal",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleField(item)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                      selectedAdjustmentFields.includes(item)
                        ? "bg-primary/10 border-primary text-foreground font-medium"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <div
                      className={`size-4 rounded flex items-center justify-center border ${
                        selectedAdjustmentFields.includes(item)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border"
                        }`}
                    >
                      {selectedAdjustmentFields.includes(item) && <Check className="size-3" />}
                    </div>
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Instruções que o Cliente Visualizará
              </label>
              <Textarea
                value={adjustmentInstructions}
                onChange={(e) => setAdjustmentInstructions(e.target.value)}
                placeholder="Ex.: O documento de eleição anexado está vencido. Favor reenviar a ata registrada na Junta Comercial..."
                rows={3}
                className="text-xs bg-background border-border"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustmentsDialogOpen(false)}
              className="border-border text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => adjustmentsMutation.mutate()}
              disabled={
                adjustmentsMutation.isPending ||
                selectedAdjustmentFields.length === 0 ||
                !adjustmentInstructions.trim()
              }
              className="text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white"
            >
              {adjustmentsMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Aprovar Conta */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Aprovar Credenciamento e Criar Conta Pix
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A aprovação gerará imediatamente uma conta operacional no SPI com chaves Pix ativas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Política Comercial / Tabela de Tarifas Aplicada
              </label>
              <Select value={selectedPricingPolicy} onValueChange={setSelectedPricingPolicy}>
                <SelectTrigger aria-label="Tabela comercial" className="h-9 text-xs bg-background border-border">
                  <SelectValue placeholder="Selecione a tabela comercial" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-xs">
                  {(pricingPolicies || []).map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.targetName} (Recebimento {p.inflowFeePercentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Parecer Técnico da Mesa (Interno)
              </label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Parecer favorável de risco e validação documental sem restrições..."
                rows={3}
                className="text-xs bg-background border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveDialogOpen(false)}
              className="border-border text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="text-xs font-semibold"
            >
              {approveMutation.isPending ? "Criando Conta..." : "Confirmar e Deferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Recusar Solicitação */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive">
              Indeferir Solicitação de Conta
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              A recusa encerra o processo de onboarding e notifica o titular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Motivo Técnico / Regulatório da Recusa
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex.: Incompatibilidade da atividade da empresa com a política de risco da SloPay..."
                rows={3}
                className="text-xs bg-background border-border"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialogOpen(false)}
              className="border-border text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              className="text-xs font-medium"
            >
              {rejectMutation.isPending ? "Gravando..." : "Confirmar Recusa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Reabrir Processo */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Reabrir Processo Indeferido
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Retorna o processo para o status &apos;Em Análise&apos; para nova verificação de compliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">
                Justificativa da Reabertura
              </label>
              <Textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Ex.: Apresentação de recurso com novo contrato social autenticado..."
                rows={3}
                className="text-xs bg-background border-border"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReopenDialogOpen(false)}
              className="border-border text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending || !reopenReason.trim()}
              className="text-xs font-medium"
            >
              {reopenMutation.isPending ? "Reabrindo..." : "Confirmar Reabertura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
