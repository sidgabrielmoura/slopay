"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, GitBranch, Save } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { demoPolicy } from "@/config/demo-policy.config";
import { queryKeys } from "@/lib/query-keys";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import { userRoles } from "@/features/users/user-access";
import type { ApprovalRule, ApprovalRuleType } from "@/types/domain";
import {
  approvalRuleError, approvalRuleTypes, approvalRulesPath, maxRequiredApprovals,
  type ApprovalRuleMember, type ApprovalRuleValues,
} from "../approval-rules";

const typeOptions = Object.entries(approvalRuleTypes).map(([value, { label }]) => ({ value, label }));
const initialValues: ApprovalRuleValues = {
  name: "",
  minAmountInCents: demoPolicy.defaultApprovalThresholdInCents,
  ruleType: "PARALLEL",
  eligibleApproverIds: [],
  requiredApprovalsCount: demoPolicy.defaultRequiredApproversCount,
  active: true,
};

function BackToRules() {
  return (
    <Button asChild variant="ghost" className="h-11 justify-self-start">
      <Link href={approvalRulesPath} prefetch={false}><ArrowLeft aria-hidden="true" /> Voltar às regras</Link>
    </Button>
  );
}

export function RuleFormScreen({ ruleId }: { ruleId?: string }) {
  const service = useGatewayService();
  const { isReadOnly, activeScenario } = useDemoScenario();
  const rules = useQuery({
    queryKey: queryKeys.approvalRules(),
    queryFn: () => service.getApprovalRules(),
    enabled: Boolean(ruleId),
  });
  const members = useQuery({
    queryKey: queryKeys.users({ purpose: "approval-rules" }),
    queryFn: () => service.getApprovalRuleMembers(),
  });
  const rule = ruleId ? rules.data?.find((item) => item.id === ruleId) : undefined;

  if (members.isPending || (ruleId && rules.isPending)) {
    return (
      <div aria-busy="true" aria-label="Carregando configuração da regra" className="grid max-w-5xl gap-5">
        <BackToRules />
        <Skeleton className="h-8 w-52 max-w-full" />
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} aria-hidden="true" className="grid gap-2">
              <Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full" />
            </div>
          ))}
        </Card>
      </div>
    );
  }
  if (members.isError || (ruleId && rules.isError)) {
    return (
      <div className="grid max-w-5xl justify-items-start gap-4">
        <BackToRules />
        <OperationFailure message="Não foi possível carregar a configuração da regra." animate={false} />
        <Button type="button" variant="outline" className="h-11" onClick={() => {
          void members.refetch();
          if (ruleId) void rules.refetch();
        }}>Tentar novamente</Button>
      </div>
    );
  }
  if ((ruleId && !rule) || (!ruleId && isReadOnly)) {
    return <Empty icon={<GitBranch aria-hidden="true" />}
      title={ruleId ? "Regra não encontrada" : "Perfil de consulta"}
      description={ruleId ? undefined : "Seu perfil permite consultar as regras existentes."}
      action={<BackToRules />} />;
  }
  return <RuleForm key={`${activeScenario}:${ruleId ?? "nova"}`} rule={rule} members={members.data} readOnly={isReadOnly} />;
}

function RuleForm({ rule, members, readOnly }: {
  rule?: ApprovalRule;
  members: ApprovalRuleMember[];
  readOnly: boolean;
}) {
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ApprovalRuleValues>(rule ?? initialValues);
  const [invalid, setInvalid] = useState<"name" | "amount" | "type" | "approvers" | "quorum">();
  const ids = draft.eligibleApproverIds;
  const ordered = draft.ruleType === "SEQUENTIAL";
  const memberById = new Map(members.map((member) => [member.id, member]));
  const selected = ids.map((id) => memberById.get(id) ?? { id, name: "Usuário removido", role: null, eligible: false });
  const choices = [...selected, ...members.filter((member) => member.eligible && !ids.includes(member.id))];
  const quorumLimit = Math.min(ids.length, maxRequiredApprovals);
  const quorumOptions = Array.from({ length: quorumLimit }, (_, index) => ({
    value: String(index + 1), label: index === 0 ? "1 aprovação" : `${index + 1} aprovações`,
  }));
  const quorumValid = draft.requiredApprovalsCount >= 1 && draft.requiredApprovalsCount <= quorumLimit;
  const save = useMutation({
    mutationFn: (values: ApprovalRuleValues) => rule
      ? service.updateApprovalRule(rule.id, values)
      : service.createApprovalRule(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.approvalRules() });
    },
  });
  const locked = readOnly || save.isPending;

  function update<K extends keyof ApprovalRuleValues>(key: K, value: ApprovalRuleValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setInvalid(undefined);
    if (save.isError) save.reset();
  }

  function move(index: number, delta: -1 | 1) {
    if (locked) return;
    const orderedIds = [...ids];
    const next = index + delta;
    if (next < 0 || next >= orderedIds.length) return;
    [orderedIds[index], orderedIds[next]] = [orderedIds[next], orderedIds[index]];
    update("eligibleApproverIds", orderedIds);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || save.isSuccess) return;
    const unavailable = draft.active && selected.some((member) => !member.eligible);
    const issue = approvalRuleError(draft) ?? (unavailable
      ? { field: "approvers" as const, message: "Retire os aprovadores indisponíveis ou salve a regra como inativa." }
      : undefined);
    if (issue) {
      setInvalid(issue.field);
      toast.error(issue.message);
      event.currentTarget.querySelector<HTMLElement>(`#rule-${issue.field}`)?.focus();
      return;
    }
    save.mutate({ ...draft, name: draft.name.trim() });
  }

  return (
    <div className="grid min-w-0 max-w-5xl gap-5">
      <BackToRules />
      <header className="grid gap-1">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">{rule ? readOnly ? "Regra de aprovação" : "Editar regra" : "Nova regra"}</h1>
        <p className="text-pretty text-sm text-muted-foreground">Configure a alçada e a forma de aprovação dos saques na demonstração.</p>
      </header>
      {save.isSuccess ? (
        <Card role="status" className="grid justify-items-center gap-3 p-6 text-center">
          <LoadingConfirmation animate />
          <h2 className="text-balance text-lg font-semibold">{rule ? "Alterações salvas" : "Regra cadastrada"}</h2>
          <p className="wrap-anywhere text-pretty text-sm text-muted-foreground">{save.data.name}</p>
          <Button asChild className="h-11">
            <Link href={approvalRulesPath} prefetch={false} ref={(node) => { node?.focus({ preventScroll: true }); }}>Ver regras</Link>
          </Button>
        </Card>
      ) : (
        <form className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]" onSubmit={submit}>
          <fieldset disabled={locked} className="grid min-w-0 gap-4">
            <Card className="min-w-0">
              <CardHeader className="space-y-0 p-5">
                <h2 className="text-balance text-lg font-semibold">Dados da regra</h2>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-4 px-5 pb-5 sm:grid-cols-2">
                <div className="grid min-w-0 gap-1.5 sm:col-span-2">
                  <label htmlFor="rule-name" className="text-sm font-medium">Nome da regra</label>
                  <Input id="rule-name" required value={draft.name} onChange={(event) => update("name", event.currentTarget.value)}
                    aria-invalid={invalid === "name" || undefined} className="h-11 aria-invalid:border-destructive!"
                    placeholder="Ex. Saques para fornecedores" />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor={readOnly ? undefined : "rule-amount"} className="text-sm font-medium">Valor mínimo</label>
                  {readOnly ? (
                    <p className="flex h-11 items-center text-sm font-medium tabular-nums"><PanelAmount cents={draft.minAmountInCents} /></p>
                  ) : (
                    <CurrencyInput id="rule-amount" valueInCents={draft.minAmountInCents} onValueChange={(cents) => update("minAmountInCents", cents)}
                      className="text-sm font-medium aria-invalid:border-destructive!" aria-invalid={invalid === "amount" || undefined} />
                  )}
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="rule-type" className="text-sm font-medium">Tipo de aprovação</label>
                  <GlideSelect id="rule-type" options={typeOptions} value={draft.ruleType} size="lg" className="w-full"
                    disabled={locked} aria-invalid={invalid === "type" || undefined}
                    onChange={(value) => update("ruleType", value as ApprovalRuleType)} />
                </div>
                <p className="text-pretty text-xs text-muted-foreground sm:col-span-2">{approvalRuleTypes[draft.ruleType].description}</p>
                <label className="flex min-h-11 w-fit items-center gap-2 text-sm sm:col-span-2">
                  <Switch checked={draft.active} disabled={locked} onCheckedChange={(active) => update("active", active)} /> Regra ativa
                </label>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader className="gap-1 space-y-0 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-balance text-lg font-semibold">Aprovadores</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">{ids.length} {ids.length === 1 ? "selecionado" : "selecionados"}</span>
                </div>
                {ordered && <p className="text-pretty text-xs text-muted-foreground">Use as setas para definir a ordem em que cada pessoa decide.</p>}
              </CardHeader>
              <CardContent className="grid min-w-0 gap-4 px-5 pb-5">
                <div id="rule-approvers" role="group" aria-label="Aprovadores da regra" tabIndex={-1}
                  aria-invalid={invalid === "approvers" || undefined} className="rounded-lg border aria-invalid:border-destructive!">
                  {choices.length > 0 ? (
                    <ul className="max-h-72 divide-y divide-border overflow-x-hidden overflow-y-auto">
                      {choices.map((member) => {
                        const index = ids.indexOf(member.id);
                        const checked = index >= 0;
                        return (
                          <li key={member.id} className="flex min-w-0 items-center justify-between gap-1 px-3">
                            <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2 py-2">
                              <Checkbox checked={checked} disabled={locked || (!checked && !member.eligible)}
                                onChange={(event) => update("eligibleApproverIds", event.currentTarget.checked
                                  ? [...ids, member.id] : ids.filter((id) => id !== member.id))} />
                              {ordered && checked && <span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">{index + 1}.</span>}
                              <span className="min-w-0">
                                <span className="block wrap-anywhere text-sm font-medium">{member.name}</span>
                                <span className="block text-xs text-muted-foreground">{member.eligible && member.role ? userRoles[member.role].label : "Indisponível"}</span>
                              </span>
                            </label>
                            {ordered && checked && !readOnly && (
                              <div className="flex shrink-0">
                                <Button type="button" variant="ghost" size="icon" className="size-11" disabled={locked || index === 0}
                                  aria-label={`Mover ${member.name} para cima`} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" /></Button>
                                <Button type="button" variant="ghost" size="icon" className="size-11" disabled={locked || index === ids.length - 1}
                                  aria-label={`Mover ${member.name} para baixo`} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" /></Button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="p-4 text-pretty text-sm text-muted-foreground">Nenhum usuário ativo tem permissão para aprovar.</p>}
                </div>
                <div className="grid min-w-0 gap-1.5 sm:max-w-xs">
                  <label htmlFor="rule-quorum" className="text-sm font-medium">Aprovações exigidas</label>
                  <GlideSelect id="rule-quorum" options={quorumOptions} value={quorumValid ? String(draft.requiredApprovalsCount) : ""}
                    placeholder={quorumLimit ? "Selecione o quórum" : "Selecione os aprovadores"} size="lg" className="w-full"
                    disabled={locked || !quorumLimit} aria-invalid={invalid === "quorum" || undefined}
                    onChange={(value) => update("requiredApprovalsCount", Number(value))} />
                </div>
              </CardContent>
            </Card>
          </fieldset>

          <Card className="min-w-0">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-5">
              <h2 className="text-balance text-lg font-semibold">Resumo</h2>
              <Badge variant={draft.active ? "success" : "secondary"}>{draft.active ? "Ativa" : "Inativa"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Saques a partir de</dt>
                  <dd className="wrap-anywhere font-semibold tabular-nums"><PanelAmount cents={draft.minAmountInCents} /></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fluxo</dt>
                  <dd>{approvalRuleTypes[draft.ruleType].label}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Quórum</dt>
                  <dd className="tabular-nums">{quorumValid ? `${draft.requiredApprovalsCount} de ${ids.length}` : "A definir"}</dd>
                </div>
              </dl>
              {rule && <p className="border-t pt-3 text-pretty text-xs text-muted-foreground">As alterações valem para novas solicitações.</p>}
            </CardContent>
          </Card>
          {save.isError && <OperationFailure message={save.error.message} className="xl:col-span-2" />}
          {!readOnly && (
            <div className="flex flex-wrap justify-end gap-2 xl:col-span-2">
              <Button asChild variant="outline" className="h-11">
                <Link href={approvalRulesPath} prefetch={false}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={save.isPending} className="h-11">
                {save.isPending ? <LoadingIndicator /> : <Save aria-hidden="true" />}
                {save.isPending ? "Salvando…" : rule ? "Salvar alterações" : "Criar regra"}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
