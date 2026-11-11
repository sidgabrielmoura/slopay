"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
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
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import type { User, UserRole, UserStatus } from "@/types/domain";

export default function AdminUsuariosPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", searchTerm, roleFilter, statusFilter],
    queryFn: () =>
      demoRepository.getUsers({
        search: searchTerm,
      }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (user: User) => {
      const nextStatus: UserStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      return demoRepository.updateUser(user.id, { status: nextStatus });
    },
    onSuccess: (updated) => {
      toast.success(
        `Status do usuário ${updated.name} alterado para ${
          updated.status === "ACTIVE" ? "Ativo" : "Inativo"
        }!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alternar status do usuário.");
    },
  });

  let users = data?.data || [];
  if (roleFilter !== "ALL") {
    users = users.filter((u) => u.role === roleFilter);
  }
  if (statusFilter !== "ALL") {
    users = users.filter((u) => u.status === statusFilter);
  }

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case "TITULAR":
        return (
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[11px]">
            Titular Legal
          </Badge>
        );
      case "APROVADOR":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px]">
            Aprovador
          </Badge>
        );
      case "OPERADOR":
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px]">
            Operador
          </Badge>
        );
      case "CONSULTA":
        return (
          <Badge className="bg-muted text-muted-foreground border border-border text-[11px]">
            Consulta
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Diretório Global de Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão consolidada de todos os operadores, aprovadores e titulares cadastrados pelas empresas clientes.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou documento..."
              className="h-9 pl-9 text-xs bg-background border-border text-foreground"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: "ALL", label: "Todos os Perfis" },
              { id: "TITULAR", label: "Titulares" },
              { id: "APROVADOR", label: "Aprovadores" },
              { id: "OPERADOR", label: "Operadores" },
              { id: "CONSULTA", label: "Consulta" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  roleFilter === tab.id
                    ? "bg-secondary text-foreground font-semibold border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Nome do Usuário
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  E-mail
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Documento
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Telefone
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Perfil de Acesso
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Último Acesso
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={8} className="h-12 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhum usuário localizado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-border hover:bg-secondary/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {u.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {u.document}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.phone}
                    </TableCell>
                    <TableCell>{renderRoleBadge(u.role)}</TableCell>
                    <TableCell>
                      {u.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="size-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <XCircle className="size-3" /> Inativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(u.lastAccessAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedUser(u)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        >
                          <Eye className="size-3.5" />
                          Permissões
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStatusMutation.mutate(u)}
                          className={`h-8 px-2 text-xs gap-1 ${
                            u.status === "ACTIVE"
                              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.status === "ACTIVE" ? (
                            <>
                              <Lock className="size-3.5" /> Desativar
                            </>
                          ) : (
                            <>
                              <Unlock className="size-3.5" /> Ativar
                            </>
                          )}
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

      {/* Permissions Matrix Dialog */}
      {selectedUser && (
        <Dialog
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
        >
          <DialogContent className="max-w-md bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                Matriz de Permissões: {selectedUser.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Perfil atribuído: <strong>{selectedUser.role}</strong> ({selectedUser.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div className="divide-y divide-border border border-border rounded-xl p-3 bg-background space-y-2">
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Visualizar Extrato & Movimentações:</span>
                  <span className={selectedUser.permissions?.transactions?.view ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedUser.permissions?.transactions?.view ? "Permitido" : "Negado"}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Exportar Relatórios Financeiros:</span>
                  <span className={selectedUser.permissions?.transactions?.export ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedUser.permissions?.transactions?.export ? "Permitido" : "Negado"}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Criar Cobranças Pix (Recebimentos):</span>
                  <span className={selectedUser.permissions?.pixReceive?.create ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedUser.permissions?.pixReceive?.create ? "Permitido" : "Negado"}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Solicitar Saques Pix:</span>
                  <span className={selectedUser.permissions?.pixWithdraw?.request ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedUser.permissions?.pixWithdraw?.request ? "Permitido" : "Negado"}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Deliberar Alçadas de Aprovação:</span>
                  <span className={selectedUser.permissions?.approvals?.decide ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedUser.permissions?.approvals?.decide ? "Permitido" : "Negado"}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">Gerenciar Configurações & Webhooks:</span>
                  <span className={selectedUser.permissions?.webhooks?.manage ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedUser.permissions?.webhooks?.manage ? "Permitido" : "Negado"}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
