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
  ShieldCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Users,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRule, ApprovalRuleType } from "@/types/domain";

export default function AdminRegrasAprovacaoPage() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    minAmountInCents: 1000000,
    ruleType: "PARALLEL" as ApprovalRuleType,
    requiredApprovalsCount: 2,
    active: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin", "approvalRules"],
    queryFn: () => demoRepository.getApprovalRules(),
  });

  const saveRuleMutation = useMutation({
    mutationFn: async () => {
      if (editingRule) {
        return demoRepository.updateApprovalRule(editingRule.id, ruleForm);
      } else {
        return demoRepository.createApprovalRule({
          name: ruleForm.name,
          minAmountInCents: Number(ruleForm.minAmountInCents),
          ruleType: ruleForm.ruleType,
          requiredApprovalsCount: Number(ruleForm.requiredApprovalsCount),
          eligibleApproverIds: ["usr-02", "usr-03"],
          active: ruleForm.active,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        editingRule
          ? "Regra de governança atualizada com sucesso!"
          : "Nova regra de alçada cadastrada!"
      );
      setEditingRule(null);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "approvalRules"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar regra de governança.");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (rule: ApprovalRule) => {
      return demoRepository.updateApprovalRule(rule.id, { active: !rule.active });
    },
    onSuccess: (updated) => {
      toast.success(
        `Regra ${updated.name} ${updated.active ? "ativada" : "desativada"}!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "approvalRules"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });

  const handleOpenCreate = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      minAmountInCents: 1000000,
      ruleType: "PARALLEL",
      requiredApprovalsCount: 2,
      active: true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      minAmountInCents: rule.minAmountInCents,
      ruleType: rule.ruleType,
      requiredApprovalsCount: rule.requiredApprovalsCount,
      active: rule.active,
    });
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Governança de Alçadas & Regras de Aprovação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Políticas de dupla custódia e quórum para autorização de saques de alto valor na SloPay.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 px-3 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 gap-1.5"
        >
          <Plus className="size-3.5" /> Nova Regra de Alçada
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Nome da Política
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Tipo de Execução
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Gatilho Mínimo
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-center">
                  Quórum Obrigatório
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Data de Criação
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
              ) : rules.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhuma regra de aprovação configurada.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow
                    key={rule.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">
                          {rule.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {rule.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] gap-1">
                        {rule.ruleType === "PARALLEL" ? (
                          <>
                            <Users className="size-3 text-primary" /> Paralela (Qualquer ordem)
                          </>
                        ) : (
                          <>
                            <Layers className="size-3 text-blue-400" /> Sequencial (Em cadeia)
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {formatCentsToBrl(rule.minAmountInCents)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-semibold text-foreground">
                      {rule.requiredApprovalsCount} aprovações
                    </TableCell>
                    <TableCell>
                      {rule.active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border border-border text-[11px]">
                          Inativa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(rule.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(rule)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <Edit2 className="size-3" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActiveMutation.mutate(rule)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {rule.active ? "Desativar" : "Ativar"}
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

      {/* Modal Criar/Editar */}
      {isCreateOpen && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {editingRule ? "Editar Regra de Alçada" : "Nova Regra de Alçada"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Defina os parâmetros de valor e quórum para autorização de movimentações financeiras.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Nome da Regra *
                </label>
                <Input
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="Ex: Alçada para Saques Acima de R$ 50.000"
                  className="h-8 text-xs bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Gatilho Mínimo (em centavos) *
                </label>
                <Input
                  type="number"
                  value={ruleForm.minAmountInCents}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      minAmountInCents: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-xs bg-background border-border text-foreground"
                />
                <span className="text-[10px] text-muted-foreground font-mono">
                  Equivale a: {formatCentsToBrl(ruleForm.minAmountInCents)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Tipo de Execução
                  </label>
                  <select
                    value={ruleForm.ruleType}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        ruleType: e.target.value as ApprovalRuleType,
                      })
                    }
                    className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
                  >
                    <option value="PARALLEL">Paralela</option>
                    <option value="SEQUENTIAL">Sequencial</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Quórum Obrigatório
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={ruleForm.requiredApprovalsCount}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        requiredApprovalsCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="h-8 text-xs bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 text-xs border-border"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={saveRuleMutation.isPending || !ruleForm.name.trim()}
                onClick={() => saveRuleMutation.mutate()}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                {saveRuleMutation.isPending ? "Salvando..." : "Salvar Regra"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
