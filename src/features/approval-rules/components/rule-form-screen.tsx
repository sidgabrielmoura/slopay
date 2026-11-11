"use client";

import React, { useState, useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, GitBranch, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRuleType } from "@/types/domain";

export function RuleFormScreen({ ruleId }: { ruleId?: string }) {
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const isEditing = Boolean(ruleId);

  const [name, setName] = useState("");
  const [minAmountInCents, setMinAmountInCents] = useState<number>(500000); // R$ 5k padrão
  const [ruleType, setRuleType] = useState<ApprovalRuleType>("PARALLEL");
  const [eligibleApproverIds, setEligibleApproverIds] = useState<string[]>([]);
  const [requiredApprovalsCount, setRequiredApprovalsCount] = useState<number>(2);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => service.getUsers(),
  });

  const { data: existingRule, isLoading: loadingRule } = useQuery({
    queryKey: queryKeys.approvalRule(ruleId || ""),
    queryFn: async () => {
      if (!ruleId) return null;
      const rules = await service.getApprovalRules();
      return rules.find((r) => r.id === ruleId) || null;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingRule) {
      setName(existingRule.name);
      setMinAmountInCents(existingRule.minAmountInCents);
      setRuleType(existingRule.ruleType);
      setEligibleApproverIds(existingRule.eligibleApproverIds);
      setRequiredApprovalsCount(existingRule.requiredApprovalsCount);
      setActive(existingRule.active);
    }
  }, [existingRule]);

  // Filtra apenas usuários elegíveis para aprovação (Aprovador ou Titular)
  const eligibleUsers = (usersData?.data ?? []).filter(
    (u) => u.role === "APROVADOR" || u.role === "TITULAR"
  );

  const toggleApprover = (userId: string) => {
    if (eligibleApproverIds.includes(userId)) {
      setEligibleApproverIds(eligibleApproverIds.filter((id) => id !== userId));
    } else {
      setEligibleApproverIds([...eligibleApproverIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe um nome para a regra de aprovação.");
      return;
    }

    if (minAmountInCents < 0) {
      toast.error("O valor mínimo não pode ser negativo.");
      return;
    }

    if (eligibleApproverIds.length === 0) {
      toast.error("Selecione ao menos um aprovador elegível.");
      return;
    }

    if (requiredApprovalsCount > eligibleApproverIds.length) {
      toast.error(
        `O quórum exigido (${requiredApprovalsCount}) não pode ser maior que o total de pessoas selecionadas (${eligibleApproverIds.length}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && ruleId) {
        await service.updateApprovalRule(ruleId, {
          name: name.trim(),
          minAmountInCents,
          ruleType,
          eligibleApproverIds,
          requiredApprovalsCount,
          active,
        });
        toast.success("Regra de aprovação atualizada com sucesso!");
      } else {
        await service.createApprovalRule({
          name: name.trim(),
          minAmountInCents,
          ruleType,
          eligibleApproverIds,
          requiredApprovalsCount,
          active,
        });
        toast.success("Regra de aprovação criada com sucesso!");
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRules() });
      router.push("/conta/regras-de-aprovacao");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar regra de aprovação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/conta/regras-de-aprovacao")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar às Regras</span>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {isEditing ? "Editar Regra de Aprovação" : "Nova Regra de Aprovação"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure a faixa de valor e as pessoas responsáveis pela liberação de saques.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GitBranch className="size-4 text-primary" />
            <span>Parâmetros de Alçada</span>
          </CardTitle>
          <CardDescription className="text-xs">
            A regra é aplicada automaticamente quando um saque atinge ou supera o valor mínimo.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome da Regra */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome da Regra *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Saques Corporativos Acima de R$ 5.000"
                disabled={submitting}
                autoFocus
              />
            </div>

            {/* Valor Mínimo */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valor Mínimo de Disparo (R$) *
              </label>
              <CurrencyInput
                valueInCents={minAmountInCents}
                onValueChange={setMinAmountInCents}
                disabled={submitting}
                placeholder="R$ 5.000,00"
              />
            </div>

            {/* Tipo de Fluxo: Paralela vs Sequencial */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de Fluxo de Aprovação
              </label>
              <Select
                value={ruleType}
                onValueChange={(val) => setRuleType(val as ApprovalRuleType)}
              >
                <SelectTrigger className="h-10 bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARALLEL">
                    Paralela (Qualquer ordem entre os selecionados)
                  </SelectItem>
                  <SelectItem value="SEQUENTIAL">
                    Sequencial (Aprovações devem seguir ordem estrita)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aprovadores Elegíveis */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Selecione os Aprovadores Elegíveis ({eligibleApproverIds.length} selecionados) *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {eligibleUsers.map((user) => {
                  const isSelected = eligibleApproverIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleApprover(user.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card/60 text-muted-foreground hover:border-border/80"
                        }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {user.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {user.role} • {user.email}
                        </p>
                      </div>
                      <div
                        className={`size-5 rounded-md border flex items-center justify-center ${isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                          }`}
                      >
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quórum Necessário */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quantidade Necessária de Aprovações (Quórum) *
              </label>
              <Select
                value={String(requiredApprovalsCount)}
                onValueChange={(val) => setRequiredApprovalsCount(Number(val))}
              >
                <SelectTrigger className="h-10 bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      disabled={n > eligibleApproverIds.length && eligibleApproverIds.length > 0}
                    >
                      {n} {n === 1 ? "aprovação" : "aprovações"} necessárias
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Ativo / Inativo */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Regra Ativa
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Quando desativada, não interceptará novas operações.
                </span>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            {/* Resumo Gerado em Tempo Real */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">
                Resumo da Política de Governança:
              </span>
              <p className="text-foreground">
                &ldquo;Saques a partir de <strong>{formatCentsToBrl(minAmountInCents)}</strong> exigem{" "}
                <strong>{requiredApprovalsCount} {requiredApprovalsCount === 1 ? "aprovação" : "aprovações"}</strong>{" "}
                entre as {eligibleApproverIds.length} pessoas selecionadas ({ruleType === "PARALLEL" ? "em qualquer ordem" : "em fila sequencial"}).&rdquo;
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting || !name.trim() || eligibleApproverIds.length === 0}
              className="w-full h-11 text-base font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>Salvando Regra...</span>
                </>
              ) : isEditing ? (
                "Salvar Alterações da Regra"
              ) : (
                "Criar Regra de Aprovação"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
