"use client";

import React, { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import type { User, UserRole, UserPermissions } from "@/types/domain";

interface UserFormScreenProps {
  userId?: string;
}

const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
  TITULAR: {
    transactions: { view: true, export: true },
    pixReceive: { create: true, view: true },
    pixWithdraw: { request: true, view: true },
    approvals: { decide: true, view: true },
    rules: { manage: true, view: true },
    users: { manage: true, view: true },
    webhooks: { manage: true, view: true },
    settings: { manage: true, view: true },
  },
  OPERADOR: {
    transactions: { view: true, export: true },
    pixReceive: { create: true, view: true },
    pixWithdraw: { request: true, view: true },
    approvals: { decide: false, view: true },
    rules: { manage: false, view: true },
    users: { manage: false, view: false },
    webhooks: { manage: false, view: true },
    settings: { manage: false, view: false },
  },
  APROVADOR: {
    transactions: { view: true, export: true },
    pixReceive: { create: false, view: true },
    pixWithdraw: { request: false, view: true },
    approvals: { decide: true, view: true },
    rules: { manage: false, view: true },
    users: { manage: false, view: true },
    webhooks: { manage: false, view: false },
    settings: { manage: false, view: false },
  },
  CONSULTA: {
    transactions: { view: true, export: true },
    pixReceive: { create: false, view: true },
    pixWithdraw: { request: false, view: true },
    approvals: { decide: false, view: true },
    rules: { manage: false, view: true },
    users: { manage: false, view: true },
    webhooks: { manage: false, view: true },
    settings: { manage: false, view: false },
  },
  ADMINISTRADOR: {
    transactions: { view: true, export: true },
    pixReceive: { create: true, view: true },
    pixWithdraw: { request: true, view: true },
    approvals: { decide: true, view: true },
    rules: { manage: true, view: true },
    users: { manage: true, view: true },
    webhooks: { manage: true, view: true },
    settings: { manage: true, view: true },
  },
};

export function UserFormScreen({ userId }: UserFormScreenProps) {
  const router = useRouter();
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();
  const queryClient = useQueryClient();
  const isEditing = Boolean(userId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("OPERADOR");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [permissions, setPermissions] = useState<UserPermissions>(
    DEFAULT_PERMISSIONS_BY_ROLE.OPERADOR
  );

  const { data: existingUser, isLoading: isLoadingUser } = useQuery({
    queryKey: queryKeys.user(userId || ""),
    queryFn: () => (userId ? service.getUserById(userId) : null),
    enabled: Boolean(isEditing && userId),
  });

  const { data: allUsers } = useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => service.getUsers(),
  });

  const isLastTitular =
    isEditing &&
    existingUser &&
    "role" in existingUser &&
    existingUser.role === "TITULAR" &&
    (allUsers?.data.filter((u) => u.role === "TITULAR").length ?? 1) <= 1;

  useEffect(() => {
    if (existingUser && typeof existingUser === "object" && "role" in existingUser && existingUser.role) {
      setName(existingUser.name || "");
      setEmail(existingUser.email || "");
      setDocument(existingUser.document || "");
      setPhone(existingUser.phone || "");
      setRole(existingUser.role);
      setStatus(existingUser.status || "ACTIVE");
      const defaultForRole =
        DEFAULT_PERMISSIONS_BY_ROLE[existingUser.role] ||
        DEFAULT_PERMISSIONS_BY_ROLE.OPERADOR;
      setPermissions(existingUser.permissions || defaultForRole);
    }
  }, [existingUser]);

  const handleRoleChange = (newRole: UserRole) => {
    if (isLastTitular && newRole !== "TITULAR") {
      toast.error("Não é possível alterar o perfil do único Titular ativo da conta.");
      return;
    }
    setRole(newRole);
    setPermissions(
      DEFAULT_PERMISSIONS_BY_ROLE[newRole] || DEFAULT_PERMISSIONS_BY_ROLE.OPERADOR
    );
  };

  const handlePermissionToggle = (
    module: keyof UserPermissions,
    action: "view" | "export" | "create" | "request" | "decide" | "manage"
  ) => {
    setPermissions((prev) => {
      const base =
        prev && prev.transactions
          ? prev
          : DEFAULT_PERMISSIONS_BY_ROLE[role] || DEFAULT_PERMISSIONS_BY_ROLE.OPERADOR;
      const currentModule =
        base[module] || (DEFAULT_PERMISSIONS_BY_ROLE.OPERADOR[module] as any);
      return {
        ...base,
        [module]: {
          ...currentModule,
          [action]: !Boolean((currentModule as any)[action]),
        },
      };
    });
  };

  const safePermissions: UserPermissions =
    permissions && permissions.transactions
      ? permissions
      : DEFAULT_PERMISSIONS_BY_ROLE[role] || DEFAULT_PERMISSIONS_BY_ROLE.OPERADOR;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isReadOnly) {
        throw new Error("Perfil de apenas consulta não possui permissão para criar ou alterar colaboradores.");
      }
      if (!name.trim()) throw new Error("Informe o nome do colaborador.");
      if (!email.trim() || !email.includes("@")) throw new Error("Informe um e-mail corporativo válido.");
      if (!document.trim()) throw new Error("Informe o CPF do colaborador.");

      if (isEditing && userId) {
        return service.updateUser(userId, {
          name,
          email,
          document,
          phone,
          role,
          status,
          permissions: safePermissions,
        });
      } else {
        return service.createUser({
          name,
          email,
          document,
          phone: phone || "(11) 99999-0000",
          role,
          status: "ACTIVE",
          permissions: safePermissions,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      toast.success(
        isEditing
          ? "Colaborador atualizado com sucesso na demonstração."
          : "Novo colaborador cadastrado com sucesso."
      );
      router.push("/conta/usuarios");
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao salvar dados do usuário.");
    },
  });

  if (isEditing && isLoadingUser) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="iconSm">
            <NextLink href="/conta/usuarios">
              <ArrowLeft className="size-4" />
            </NextLink>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEditing ? `Editar Colaborador` : "Novo Colaborador"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditing
                ? `Atualize perfis e permissões de ${name || "colaborador"}.`
                : "Cadastre um novo usuário com papel e acessos granulares."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <NextLink href="/conta/usuarios">Cancelar</NextLink>
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isReadOnly}
            className="gap-1.5 font-semibold"
          >
            {isReadOnly ? <Lock className="size-4" /> : <Save className="size-4" />}
            <span>{saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Usuário"}</span>
          </Button>
        </div>
      </div>

      {isReadOnly && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <Lock className="size-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">Perfil Demonstrativo de Consulta Ativo</p>
            <p className="text-muted-foreground mt-0.5">
              Seu perfil atual possui privilégios estritamente de leitura. A criação e alteração de colaboradores estão desabilitadas.
            </p>
          </div>
        </div>
      )}

      {isLastTitular && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-300">Único Usuário Titular da Conta</p>
            <p className="text-amber-200/90 leading-relaxed">
              Este colaborador é o único titular ativo da conta. Por diretriz de governança, seu perfil não pode ser rebaixado para Operador, Aprovador ou Consulta, nem inativado.
            </p>
          </div>
        </div>
      )}

      {/* Dados Gerais */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            Identificação do Usuário
          </CardTitle>
          <CardDescription className="text-xs">
            Dados pessoais e de contato para registro na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nome Completo *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mariana Silveira"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">E-mail Corporativo *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mariana@empresa.com.br"
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">CPF do Titular / Operador *</label>
              <Input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="h-10 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Telefone / WhatsApp</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perfil & Nível de Acesso */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Papel Funcional (Perfil)
          </CardTitle>
          <CardDescription className="text-xs">
            Selecione o papel do usuário. O papel define o template inicial de permissões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: "TITULAR" as UserRole,
                label: "Titular",
                badge: "Acesso Total",
                desc: "Administração total da conta, regras de alçada e aprovações sem restrição.",
              },
              {
                id: "OPERADOR" as UserRole,
                label: "Operador",
                badge: "Operações",
                desc: "Gera cobranças e cria solicitações de saque (sujeitas a alçada).",
              },
              {
                id: "APROVADOR" as UserRole,
                label: "Aprovador",
                badge: "Governança",
                desc: "Avalia, aprova ou rejeita solicitações de saque que requerem alçada.",
              },
              {
                id: "CONSULTA" as UserRole,
                label: "Consulta",
                badge: "Somente Leitura",
                desc: "Visualiza relatórios, extratos e dashboards sem poder realizar movimentações.",
              },
            ].map((p) => {
              const isSelected = role === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleRoleChange(p.id)}
                  className={`flex flex-col text-left p-3.5 rounded-lg border transition-all ${isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:bg-muted/50"
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-sm font-semibold text-foreground">{p.label}</span>
                    <Badge variant={isSelected ? "default" : "outline"} className="text-[10px]">
                      {p.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                    {p.desc}
                  </p>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <CheckCircle2 className="size-3.5" />
                      <span>Selecionado</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permissões Granulares por Módulo */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Permissões Detalhadas</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Ajuste os privilégios específicos caso este usuário necessite de acessos customizados.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs gap-1">
              <Info className="size-3 text-muted-foreground" />
              Baseado no perfil {role}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {/* Movimentações */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Extrato & Movimentações</p>
                <p className="text-xs text-muted-foreground">
                  Consultar lançamentos no extrato e exportar relatórios CSV/PDF.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.transactions?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("transactions", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.transactions?.export ?? true}
                    onCheckedChange={() => handlePermissionToggle("transactions", "export")}
                  />
                  <span className="text-xs text-foreground">Exportar</span>
                </label>
              </div>
            </div>

            {/* Recebimento Pix */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Cobranças & Recebimento Pix</p>
                <p className="text-xs text-muted-foreground">
                  Gerar QR Codes dinâmicos e consultar cobranças emitidas.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.pixReceive?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("pixReceive", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.pixReceive?.create ?? false}
                    onCheckedChange={() => handlePermissionToggle("pixReceive", "create")}
                  />
                  <span className="text-xs text-foreground">Criar Cobranças</span>
                </label>
              </div>
            </div>

            {/* Saques Pix */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Saque Pix (Direto & Lote)</p>
                <p className="text-xs text-muted-foreground">
                  Solicitar transferências Pix para chaves externas.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.pixWithdraw?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("pixWithdraw", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.pixWithdraw?.request ?? false}
                    onCheckedChange={() => handlePermissionToggle("pixWithdraw", "request")}
                  />
                  <span className="text-xs text-foreground">Solicitar Saques</span>
                </label>
              </div>
            </div>

            {/* Aprovações */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Fila de Aprovações</p>
                <p className="text-xs text-muted-foreground">
                  Avaliar solicitações de saque e lotes sob regras de alçada.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.approvals?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("approvals", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.approvals?.decide ?? false}
                    onCheckedChange={() => handlePermissionToggle("approvals", "decide")}
                  />
                  <span className="text-xs text-foreground">Aprovar / Rejeitar</span>
                </label>
              </div>
            </div>

            {/* Regras */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Regras de Aprovação</p>
                <p className="text-xs text-muted-foreground">
                  Configurar faixas de valores e quóruns de aprovação.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.rules?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("rules", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.rules?.manage ?? false}
                    onCheckedChange={() => handlePermissionToggle("rules", "manage")}
                  />
                  <span className="text-xs text-foreground">Gerenciar Regras</span>
                </label>
              </div>
            </div>

            {/* Usuários */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Gestão de Usuários</p>
                <p className="text-xs text-muted-foreground">
                  Cadastrar, editar ou revogar acessos de novos colaboradores.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.users?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("users", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.users?.manage ?? false}
                    onCheckedChange={() => handlePermissionToggle("users", "manage")}
                  />
                  <span className="text-xs text-foreground">Gerenciar Usuários</span>
                </label>
              </div>
            </div>

            {/* Webhooks */}
            <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Webhooks & Integrações</p>
                <p className="text-xs text-muted-foreground">
                  Criar e manter endpoints HTTP para notificações de eventos Pix.
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.webhooks?.view ?? true}
                    onCheckedChange={() => handlePermissionToggle("webhooks", "view")}
                  />
                  <span className="text-xs text-foreground">Visualizar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={safePermissions.webhooks?.manage ?? false}
                    onCheckedChange={() => handlePermissionToggle("webhooks", "manage")}
                  />
                  <span className="text-xs text-foreground">Gerenciar Endpoints</span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
