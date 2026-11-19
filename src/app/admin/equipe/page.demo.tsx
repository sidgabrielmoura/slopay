"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  XCircle,
  Globe,
  Building2,
  Edit2,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "@/types/domain";

export default function AdminEquipePage() {
  const queryClient = useQueryClient();
  const [editingMember, setEditingMember] = useState<AdminUser | null>(null);
  const [roleForm, setRoleForm] = useState<{
    role: AdminUser["role"];
    scope: AdminUser["scope"];
  }>({
    role: "ONBOARDING_ANALYST",
    scope: "GLOBAL",
  });

  const { data: team = [], isLoading } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => demoRepository.getAdminTeam(),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingMember) return;
      return demoRepository.updateAdminUser(editingMember.id, {
        role: roleForm.role,
        scope: roleForm.scope,
      });
    },
    onSuccess: (updated) => {
      if (updated) {
        toast.success(`Permissões do membro ${updated.name} atualizadas!`);
      }
      setEditingMember(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar membro da equipe.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (member: AdminUser) => {
      const nextStatus = member.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
      return demoRepository.updateAdminUser(member.id, { status: nextStatus });
    },
    onSuccess: (updated) => {
      toast.success(
        `Membro ${updated.name} ${
          updated.status === "ACTIVE" ? "reativado" : "desativado"
        }!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });

  const handleOpenEdit = (m: AdminUser) => {
    setEditingMember(m);
    setRoleForm({
      role: m.role,
      scope: m.scope,
    });
  };

  const renderRoleBadge = (role: AdminUser["role"]) => {
    switch (role) {
      case "SUPERADMIN":
        return (
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[11px]">
            Superadmin
          </Badge>
        );
      case "ONBOARDING_ANALYST":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px]">
            Analista KYC / Onboarding
          </Badge>
        );
      case "OPERATIONS":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
            Operações & Liquidação
          </Badge>
        );
      case "SUPPORT":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
            Suporte N3
          </Badge>
        );
      case "AUDITOR":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px]">
            Auditor de Compliance
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
            Equipe Administrativa & Governança Interna
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão de acessos técnicos, analistas de onboarding e operadores credenciados no console da SloPay.
          </p>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Membro
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  E-mail Institucional
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Papel
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Escopo
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Último Login
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7} className="h-12 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                team.map((m) => (
                  <TableRow
                    key={m.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {m.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {m.email}
                    </TableCell>
                    <TableCell>{renderRoleBadge(m.role)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {m.scope === "GLOBAL" ? (
                          <>
                            <Globe className="size-3 text-primary" /> Global
                          </>
                        ) : (
                          <>
                            <Building2 className="size-3 text-muted-foreground" /> Específico
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="size-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <XCircle className="size-3" /> Desativado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {m.lastLoginAt ? formatDateTime(m.lastLoginAt) : "Nunca logou"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(m)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <Edit2 className="size-3" /> Editar
                        </Button>
                        {m.id !== "admin-01" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleStatusMutation.mutate(m)}
                            className={`h-8 px-2 text-xs gap-1 ${
                              m.status === "ACTIVE"
                                ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              }`}
                          >
                            {m.status === "ACTIVE" ? (
                              <>
                                <Lock className="size-3.5" /> Desativar
                              </>
                            ) : (
                              <>
                                <Unlock className="size-3.5" /> Ativar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Member Dialog */}
      {editingMember && (
        <Dialog
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
        >
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Editar Permissões: {editingMember.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                {editingMember.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="team-member-role" className="text-xs font-medium text-foreground">
                  Papel Institucional
                </label>
                <Select
                  value={roleForm.role}
                  onValueChange={(role) =>
                    setRoleForm((current) => ({ ...current, role: role as AdminUser["role"] }))
                  }
                >
                  <SelectTrigger id="team-member-role" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="SUPERADMIN">Superadmin (Acesso Total)</SelectItem>
                      <SelectItem value="ONBOARDING_ANALYST">Analista KYC / Onboarding</SelectItem>
                      <SelectItem value="OPERATIONS">Operações & Liquidação</SelectItem>
                      <SelectItem value="SUPPORT">Suporte N3</SelectItem>
                      <SelectItem value="AUDITOR">Auditor de Compliance</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="team-member-scope" className="text-xs font-medium text-foreground">
                  Escopo de Atuação
                </label>
                <Select
                  value={roleForm.scope}
                  onValueChange={(scope) =>
                    setRoleForm((current) => ({ ...current, scope: scope as AdminUser["scope"] }))
                  }
                >
                  <SelectTrigger id="team-member-scope" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="GLOBAL">Global (Todas as empresas e operações)</SelectItem>
                      <SelectItem value="ASSIGNED">Específico (Somente carteira designada)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingMember(null)}
                className="h-8 text-xs border-border"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
