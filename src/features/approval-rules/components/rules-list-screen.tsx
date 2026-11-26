"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import { FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { PanelAmount } from "@/components/layout/panel-privacy";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query-keys";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import type { ApprovalRule } from "@/types/domain";
import { approvalRuleTypes, approvalRulesPath, newApprovalRulePath } from "../approval-rules";

const statusOptions = [
  { value: "all", label: "Todas as regras" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

export function RulesListScreen() {
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();
  const queryClient = useQueryClient();
  const filterRef = useRef<HTMLButtonElement>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState("all");
  const [target, setTarget] = useState<ApprovalRule | null>(null);

  const rules = useQuery({
    queryKey: queryKeys.approvalRules(),
    queryFn: () => service.getApprovalRules(),
  });
  const members = useQuery({
    queryKey: queryKeys.users({ purpose: "approval-rules" }),
    queryFn: () => service.getApprovalRuleMembers(),
  });
  const memberNames = new Map(members.data?.map((member) => [member.id, member.name]));
  const visible = rules.data?.filter((rule) => status === "all" || rule.active === (status === "active")) ?? [];
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!await service.deleteApprovalRule(id)) throw new Error("Regra não encontrada.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.approvalRules() });
    },
  });

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Regras de aprovação</h1>
          <p className="text-pretty text-sm text-muted-foreground">Defina a partir de que valor os saques exigem aprovação e quem pode decidir.</p>
        </div>
        {!isReadOnly && (
          <Button asChild className="h-11 w-full sm:w-auto">
            <Link href={newApprovalRulePath} prefetch={false}><Plus aria-hidden="true" /> Nova regra</Link>
          </Button>
        )}
      </header>

      <Card className="min-w-0">
        <CardHeader className="gap-3 space-y-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="grid gap-1">
            <h2 className="text-balance text-lg font-semibold">Alçadas de saque</h2>
            <p className="text-pretty text-xs text-muted-foreground">
              Entre as regras ativas que se aplicam, vale a de maior valor mínimo. Em caso de empate, vale a primeira cadastrada.
            </p>
          </div>
          <FilterSheet value={{ status }} defaults={{ status: "all" }} active={status !== "all"} triggerRef={filterRef}
            onApply={draft => setStatus(draft.status)}>
            {(draft, setDraft) => <FilterSelect label="Situação" options={statusOptions} value={draft.status}
              onChange={status => setDraft({ status })} />}
          </FilterSheet>
        </CardHeader>

        <div className="border-t" aria-busy={rules.isFetching || members.isFetching}>
          {rules.isPending || members.isPending ? (
            <div aria-label="Carregando regras" className="divide-y divide-border">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="grid gap-2 p-4 sm:px-5" aria-hidden="true">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-36 max-w-full" />
                </div>
              ))}
            </div>
          ) : rules.isError || members.isError ? (
            <div className="grid justify-items-start gap-3 p-5">
              <OperationFailure message="Não foi possível carregar as regras de aprovação." animate={false} />
              <Button type="button" variant="outline" className="h-11" onClick={() => { void rules.refetch(); void members.refetch(); }}>Tentar novamente</Button>
            </div>
          ) : visible.length > 0 ? (
            <ul aria-label="Regras cadastradas" className="divide-y divide-border">
              {visible.map((rule) => {
                const names = rule.eligibleApproverIds.map((id) => memberNames.get(id) ?? "Usuário indisponível");
                const label = isReadOnly ? "Ver" : "Editar";
                return (
                  <li key={rule.id} className="grid min-w-0 gap-3 p-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="min-w-0 wrap-anywhere text-balance text-sm font-semibold">{rule.name}</h3>
                        <Badge variant={rule.active ? "success" : "secondary"}>{rule.active ? "Ativa" : "Inativa"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        A partir de <span className="font-medium text-foreground"><PanelAmount cents={rule.minAmountInCents} /></span>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular-nums">
                        {rule.requiredApprovalsCount} de {rule.eligibleApproverIds.length} aprovações · {approvalRuleTypes[rule.ruleType].label}
                      </p>
                      <p className="mt-1 line-clamp-2 wrap-anywhere text-xs text-muted-foreground">{names.join(", ")}</p>
                    </div>
                    <div className="flex gap-1 lg:justify-end">
                      <Button asChild variant="ghost" size="icon" className="size-11">
                        <Link href={`${approvalRulesPath}/${encodeURIComponent(rule.id)}`} prefetch={false} aria-label={`${label} ${rule.name}`}>
                          {isReadOnly ? <ChevronRight aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                        </Link>
                      </Button>
                      {!isReadOnly && (
                        <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive"
                          aria-label={`Excluir ${rule.name}`} onClick={(event) => {
                            removeTrigger.current = event.currentTarget;
                            remove.reset();
                            setTarget(rule);
                          }}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={<GitBranch aria-hidden="true" />} className="rounded-none border-0"
              title={status === "all" ? "Nenhuma regra cadastrada" : "Nenhuma regra com este status"}
              action={status !== "all"
                ? <Button type="button" variant="outline" className="h-11" onClick={() => { setStatus("all"); filterRef.current?.focus(); }}>Ver todas as regras</Button>
                : !isReadOnly ? <Button asChild className="h-11"><Link href={newApprovalRulePath} prefetch={false}>Criar regra</Link></Button> : undefined} />
          )}
        </div>
      </Card>

      <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !remove.isPending) setTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md"
          onEscapeKeyDown={(event) => { if (remove.isPending) event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = removeTrigger.current;
            if (trigger?.isConnected) trigger.focus();
            else filterRef.current?.focus();
          }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance">{remove.isSuccess ? "Regra excluída" : "Excluir regra de aprovação?"}</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere text-pretty">
              {remove.isSuccess ? `A regra “${target?.name}” foi excluída.` : `A regra “${target?.name}” deixa de valer para novos saques. Solicitações já abertas mantêm a regra original.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.isSuccess && <div className="justify-self-center"><LoadingConfirmation animate /></div>}
          {remove.isError && <OperationFailure message={remove.error.message} />}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={remove.isPending}>{remove.isSuccess ? "Fechar" : "Cancelar"}</AlertDialogCancel>
            {!remove.isSuccess && (
              <Button type="button" variant="destructive" className="h-11" disabled={remove.isPending || isReadOnly}
                onClick={() => { if (target) remove.mutate(target.id); }}>
                {remove.isPending && <LoadingIndicator />}
                {remove.isPending ? "Excluindo…" : "Excluir regra"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
