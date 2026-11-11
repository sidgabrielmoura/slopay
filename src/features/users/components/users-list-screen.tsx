"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Users2, Plus, RotateCcw, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types/domain";

export function UsersListScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.users({ search }),
    queryFn: () => service.getUsers({ search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      toast.success("Usuário removido da demonstração com sucesso.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover usuário.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Gestão de Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle de colaboradores, perfis de acesso e permissões granulares por módulo.
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
            <NextLink href="/conta/usuarios/novo">
              <Plus className="size-4" />
              <span>Novo Usuário</span>
            </NextLink>
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou documento..."
          className="pl-9 h-10 bg-card/80"
        />
      </div>

      <Card className="border-border bg-card/80 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8">
            <Empty
              title="Nenhum usuário encontrado"
              description="Tente ajustar os termos da busca."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {user.document}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "TITULAR"
                          ? "default"
                          : user.role === "APROVADOR"
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {user.role === "TITULAR"
                        ? "Titular"
                        : user.role === "OPERADOR"
                        ? "Operador"
                        : user.role === "APROVADOR"
                        ? "Aprovador"
                        : "Consulta"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Ativo
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.phone}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(user.lastAccessAt, "short")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => router.push(`/conta/usuarios/${user.id}`)}
                        title="Editar usuário"
                      >
                        <Edit className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => setDeleteTarget(user)}
                        title="Excluir usuário"
                        disabled={user.role === "TITULAR" && data.data.filter(u => u.role === "TITULAR").length <= 1}
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
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Colaborador?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Você está prestes a remover o acesso demonstrativo de &ldquo;{deleteTarget?.name}&rdquo; ({deleteTarget?.email}). Nenhum convite real é cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
