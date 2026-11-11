"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatCentsToBrl } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";
import {
  GitBranch,
  Plus,
  RotateCcw,
  Edit,
  Trash2,
  CheckCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRule } from "@/types/domain";

export function RulesListScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const { hideValues } = usePreferences();

  const [deleteRuleTarget, setDeleteRuleTarget] = useState<ApprovalRule | null>(
    null
  );

  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.approvalRules(),
    queryFn: () => service.getApprovalRules(),
  });

  const { data: usersData } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => service.getUsers(),
  });

  const usersMap = new Map((usersData?.data ?? []).map((u) => [u.id, u.name]));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.deleteApprovalRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRules() });
      toast.success("Regra de aprovação excluída com sucesso.");
      setDeleteRuleTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir regra.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Regras de Aprovação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina limites de alçada, quórum de aprovadores e fluxos sequenciais ou paralelos.
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
            <NextLink href="/conta/regras-de-aprovacao/nova">
              <Plus className="size-4" />
              <span>Nova Regra</span>
            </NextLink>
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8">
            <Empty
              title="Nenhuma regra configurada"
              description="Sem regras ativas, as operações são processadas conforme os limites gerais da conta."
              action={
                <Button asChild size="sm">
                  <NextLink href="/conta/regras-de-aprovacao/nova">
                    Criar Primeira Regra
                  </NextLink>
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Regra</TableHead>
                <TableHead>Valor Mínimo</TableHead>
                <TableHead>Tipo de Fluxo</TableHead>
                <TableHead>Quórum Exigido</TableHead>
                <TableHead>Aprovadores Elegíveis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-semibold text-sm text-foreground">
                    {rule.name}
                  </TableCell>
                  <TableCell className="font-bold tabular-nums text-foreground">
                    {formatCentsToBrl(rule.minAmountInCents, { hideValue: hideValues })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {rule.ruleType === "PARALLEL" ? "Paralela (Qualquer ordem)" : "Sequencial (Em fila)"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {rule.requiredApprovalsCount} de {rule.eligibleApproverIds.length} pessoas
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {rule.eligibleApproverIds.map((id) => (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground"
                        >
                          {usersMap.get(id) || id}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.active ? "success" : "secondary"} className="text-[10px]">
                      {rule.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() =>
                          router.push(`/conta/regras-de-aprovacao/${rule.id}`)
                        }
                        title="Editar regra"
                      >
                        <Edit className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => setDeleteRuleTarget(rule)}
                        title="Excluir regra"
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

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={!!deleteRuleTarget}
        onOpenChange={(open) => !open && setDeleteRuleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra de Aprovação?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Você está prestes a remover a regra &ldquo;{deleteRuleTarget?.name}&rdquo;.
              Operações que já foram geradas com base nesta regra preservarão o snapshot original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteRuleTarget && deleteMutation.mutate(deleteRuleTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Regra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
