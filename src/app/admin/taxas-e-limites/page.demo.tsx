"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { formatCentsToBrl } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Percent,
  Sliders,
  ShieldCheck,
  Edit2,
  Building2,
  Globe,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { PricingPolicy, LimitPolicy } from "@/types/domain";

export default function AdminTaxasELimitesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"PRICING" | "LIMITS">("PRICING");

  // Pricing Modal State
  const [editingPricing, setEditingPricing] = useState<PricingPolicy | null>(null);
  const [pricingForm, setPricingForm] = useState({
    inflowFeePercentage: 0.99,
    inflowFeeFixedInCents: 50,
    outflowFeePercentage: 0,
    outflowFeeFixedInCents: 100,
    reason: "",
  });

  // Limit Modal State
  const [editingLimit, setEditingLimit] = useState<LimitPolicy | null>(null);
  const [limitForm, setLimitForm] = useState({
    transactionLimitInCents: 5000000,
    dailyLimitInCents: 10000000,
    nightlyLimitInCents: 1000000,
    reason: "",
  });

  const { data: pricingPolicies = [], isLoading: isLoadingPricing } = useQuery({
    queryKey: ["admin", "pricingPolicies"],
    queryFn: () => demoRepository.getPricingPolicies(),
  });

  const { data: limitPolicies = [], isLoading: isLoadingLimits } = useQuery({
    queryKey: ["admin", "limitPolicies"],
    queryFn: () => demoRepository.getLimitPolicies(),
  });

  // Pricing Mutation
  const updatePricingMutation = useMutation({
    mutationFn: async () => {
      if (!editingPricing) return;
      return demoRepository.updatePricingPolicy(
        editingPricing.id,
        {
          inflowFeePercentage: Number(pricingForm.inflowFeePercentage),
          inflowFeeFixedInCents: Number(pricingForm.inflowFeeFixedInCents),
          outflowFeePercentage: Number(pricingForm.outflowFeePercentage),
          outflowFeeFixedInCents: Number(pricingForm.outflowFeeFixedInCents),
        },
        pricingForm.reason
      );
    },
    onSuccess: () => {
      toast.success("Política de preços atualizada e registrada na auditoria!");
      setEditingPricing(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "pricingPolicies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar política comercial.");
    },
  });

  // Limit Mutation
  const updateLimitMutation = useMutation({
    mutationFn: async () => {
      if (!editingLimit) return;
      return demoRepository.updateLimitPolicy(
        editingLimit.id,
        {
          transactionLimitInCents: Number(limitForm.transactionLimitInCents),
          dailyLimitInCents: Number(limitForm.dailyLimitInCents),
          nightlyLimitInCents: Number(limitForm.nightlyLimitInCents),
        },
        limitForm.reason
      );
    },
    onSuccess: () => {
      toast.success("Política de limites operacionais atualizada e auditada!");
      setEditingLimit(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "limitPolicies"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar política de limites.");
    },
  });

  const handleOpenPricingModal = (p: PricingPolicy) => {
    setEditingPricing(p);
    setPricingForm({
      inflowFeePercentage: p.inflowFeePercentage,
      inflowFeeFixedInCents: p.inflowFeeFixedInCents,
      outflowFeePercentage: p.outflowFeePercentage,
      outflowFeeFixedInCents: p.outflowFeeFixedInCents,
      reason: "",
    });
  };

  const handleOpenLimitModal = (l: LimitPolicy) => {
    setEditingLimit(l);
    setLimitForm({
      transactionLimitInCents: l.transactionLimitInCents,
      dailyLimitInCents: l.dailyLimitInCents,
      nightlyLimitInCents: l.nightlyLimitInCents,
      reason: "",
    });
  };

  const renderScopeBadge = (scope: "GLOBAL" | "COMPANY" | "ACCOUNT") => {
    switch (scope) {
      case "GLOBAL":
        return (
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[11px] gap-1">
            <Globe className="size-3" /> Padrão Global
          </Badge>
        );
      case "COMPANY":
        return (
          <Badge className="bg-secondary text-foreground border border-border text-[11px] gap-1">
            <Building2 className="size-3" /> Empresa Específica
          </Badge>
        );
      case "ACCOUNT":
        return (
          <Badge className="bg-muted text-muted-foreground border border-border text-[11px]">
            Conta Operacional
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gestão de Taxas & Limites Operacionais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuração de tabelas comerciais de spread, comissões Pix e governança de alçadas de risco.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("PRICING")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "PRICING"
              ? "bg-secondary text-foreground font-semibold border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Percent className="size-3.5 text-primary" />
          Políticas de Tarifas ({pricingPolicies.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LIMITS")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "LIMITS"
              ? "bg-secondary text-foreground font-semibold border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Sliders className="size-3.5 text-primary" />
          Políticas de Limites ({limitPolicies.length})
        </button>
      </div>

      {/* Tab Content: PRICING */}
      {activeTab === "PRICING" && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Escopo / Alvo
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Tarifa de Entrada (Pix In)
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Tarifa de Saída (Pix Out)
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Vigência
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Última Atualização
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">
                    Ação
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPricing ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={6} className="h-14 text-center">
                        <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pricingPolicies.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {renderScopeBadge(p.scope)}
                          <span className="font-semibold text-xs text-foreground">
                            {p.targetName || "Tabela Geral Padrão"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {p.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-emerald-400">
                          {p.inflowFeePercentage.toFixed(2)}% + {formatCentsToBrl(p.inflowFeeFixedInCents)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          por QR Code liquidado
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-amber-400">
                          {p.outflowFeePercentage > 0 ? `${p.outflowFeePercentage.toFixed(2)}% + ` : ""}
                          {formatCentsToBrl(p.outflowFeeFixedInCents)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          por envio efetuado
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      Desde {formatDateTime(p.effectiveFrom)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground font-medium">
                          {p.updatedBy}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(p.updatedAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPricingModal(p)}
                        className="h-8 px-2.5 text-xs border-border hover:bg-secondary/60 gap-1"
                      >
                        <Edit2 className="size-3" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Tab Content: LIMITS */}
      {activeTab === "LIMITS" && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Escopo / Alvo
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">
                    Limite por Transação
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">
                    Limite Diário (Diurno)
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">
                    Limite Noturno (20h-06h)
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium">
                    Última Alteração
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium text-right">
                    Ação
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLimits ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={6} className="h-14 text-center">
                        <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : limitPolicies.map((l) => (
                  <TableRow
                    key={l.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {renderScopeBadge(l.scope)}
                          <span className="font-semibold text-xs text-foreground">
                            {l.targetName || "Política Geral Padrão"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {l.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {formatCentsToBrl(l.transactionLimitInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {formatCentsToBrl(l.dailyLimitInCents)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-muted-foreground">
                      {formatCentsToBrl(l.nightlyLimitInCents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground font-medium">
                          {l.updatedBy}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(l.updatedAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenLimitModal(l)}
                        className="h-8 px-2.5 text-xs border-border hover:bg-secondary/60 gap-1"
                      >
                        <Edit2 className="size-3" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit Pricing Modal */}
      {editingPricing && (
        <Dialog
          open={!!editingPricing}
          onOpenChange={(open) => !open && setEditingPricing(null)}
        >
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Editar Política de Preços Pix
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Alvo: {editingPricing.targetName || "Tabela Geral Padrão"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tarifa Pix In (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingForm.inflowFeePercentage}
                    onChange={(e) =>
                      setPricingForm({
                        ...pricingForm,
                        inflowFeePercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tarifa Pix In Fixa (centavos)
                  </label>
                  <Input
                    type="number"
                    value={pricingForm.inflowFeeFixedInCents}
                    onChange={(e) =>
                      setPricingForm({
                        ...pricingForm,
                        inflowFeeFixedInCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tarifa Pix Out (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingForm.outflowFeePercentage}
                    onChange={(e) =>
                      setPricingForm({
                        ...pricingForm,
                        outflowFeePercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tarifa Pix Out Fixa (centavos)
                  </label>
                  <Input
                    type="number"
                    value={pricingForm.outflowFeeFixedInCents}
                    onChange={(e) =>
                      setPricingForm({
                        ...pricingForm,
                        outflowFeeFixedInCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Justificativa Formal / Motivo da Alteração *
                </label>
                <Textarea
                  value={pricingForm.reason}
                  onChange={(e) =>
                    setPricingForm({ ...pricingForm, reason: e.target.value })
                  }
                  placeholder="Ex: Negociação comercial por volume aprovada pela diretoria comercial."
                  rows={2}
                  className="text-xs bg-background border-border text-foreground resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPricing(null)}
                className="h-8 text-xs border-border"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={updatePricingMutation.isPending || !pricingForm.reason.trim()}
                onClick={() => updatePricingMutation.mutate()}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                {updatePricingMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Limit Modal */}
      {editingLimit && (
        <Dialog
          open={!!editingLimit}
          onOpenChange={(open) => !open && setEditingLimit(null)}
        >
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Editar Limites Operacionais Pix
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Alvo: {editingLimit.targetName || "Política Geral Padrão"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Limite por Transação Única (em centavos)
                  </label>
                  <Input
                    type="number"
                    value={limitForm.transactionLimitInCents}
                    onChange={(e) =>
                      setLimitForm({
                        ...limitForm,
                        transactionLimitInCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Equivale a: {formatCentsToBrl(limitForm.transactionLimitInCents)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Limite Diário Global (em centavos)
                  </label>
                  <Input
                    type="number"
                    value={limitForm.dailyLimitInCents}
                    onChange={(e) =>
                      setLimitForm({
                        ...limitForm,
                        dailyLimitInCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Equivale a: {formatCentsToBrl(limitForm.dailyLimitInCents)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Limite Noturno 20h às 06h (em centavos)
                  </label>
                  <Input
                    type="number"
                    value={limitForm.nightlyLimitInCents}
                    onChange={(e) =>
                      setLimitForm({
                        ...limitForm,
                        nightlyLimitInCents: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Equivale a: {formatCentsToBrl(limitForm.nightlyLimitInCents)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Justificativa Formal / Parecer de Risco *
                </label>
                <Textarea
                  value={limitForm.reason}
                  onChange={(e) =>
                    setLimitForm({ ...limitForm, reason: e.target.value })
                  }
                  placeholder="Ex: Parecer de risco favorável com base no histórico transacional dos últimos 6 meses."
                  rows={2}
                  className="text-xs bg-background border-border text-foreground resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingLimit(null)}
                className="h-8 text-xs border-border"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={updateLimitMutation.isPending || !limitForm.reason.trim()}
                onClick={() => updateLimitMutation.mutate()}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                {updateLimitMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
