"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/query-keys";
import { isValidCPF } from "@/lib/validators";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import type { User, UserPermissions, UserRole } from "@/types/domain";
import { userRoles, usersPath, userStatusLabels } from "../user-access";

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

type AccessAction = "export" | "create" | "request" | "decide" | "manage";
const permissionGroups = [
  { key: "transactions", label: "Movimentações", action: "export", actionLabel: "Exportar" },
  { key: "pixReceive", label: "Recebimento Pix", action: "create", actionLabel: "Criar cobranças" },
  { key: "pixWithdraw", label: "Saques Pix", action: "request", actionLabel: "Solicitar saques" },
  { key: "approvals", label: "Aprovações", action: "decide", actionLabel: "Decidir solicitações" },
  { key: "rules", label: "Regras de aprovação", action: "manage", actionLabel: "Gerenciar regras" },
  { key: "users", label: "Usuários", action: "manage", actionLabel: "Gerenciar usuários" },
  { key: "webhooks", label: "Webhooks", action: "manage", actionLabel: "Gerenciar webhooks" },
] as const satisfies ReadonlyArray<{ key: keyof UserPermissions; label: string; action: AccessAction; actionLabel: string }>;

function BackToUsers({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  return (
    <Button asChild variant={variant} className="h-11 justify-self-start">
      <Link href={usersPath} prefetch={false}><ArrowLeft aria-hidden="true" /> Voltar aos usuários</Link>
    </Button>
  );
}

export function UserFormScreen({ userId }: { userId?: string }) {
  const service = useGatewayService();
  const { isReadOnly, activeScenario } = useDemoScenario();
  const existing = useQuery({
    queryKey: queryKeys.user(userId ?? ""),
    queryFn: () => userId ? service.getUserById(userId) : null,
    enabled: Boolean(userId),
  });

  if (userId && existing.isPending) {
    return (
      <div className="grid max-w-4xl gap-5" aria-busy="true" aria-label="Carregando usuário">
        <BackToUsers />
        <Skeleton className="h-8 w-52 max-w-full" />
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (userId && (existing.isError || !existing.data)) {
    return (
      <div className="grid max-w-4xl gap-4">
        <BackToUsers />
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Usuário</h1>
        {existing.isError ? (
          <>
            <OperationFailure message="Não foi possível carregar o usuário." animate={false} />
            <Button type="button" variant="outline" className="h-11 justify-self-start" onClick={() => void existing.refetch()}>Tentar novamente</Button>
          </>
        ) : <Empty icon={<UserRound aria-hidden="true" />} title="Usuário não encontrado" />}
      </div>
    );
  }

  return <UserForm key={`${activeScenario}:${userId ?? "novo"}`} user={userId ? existing.data ?? undefined : undefined} readOnly={isReadOnly} />;
}

function UserForm({ user, readOnly }: { user?: User; readOnly: boolean }) {
  const service = useGatewayService();
  const client = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [document, setDocument] = useState(user?.document ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "OPERADOR");
  const [permissions, setPermissions] = useState(user?.permissions ?? DEFAULT_PERMISSIONS_BY_ROLE[role]);
  const [invalidCpf, setInvalidCpf] = useState(false);
  const editingOwner = user?.role === "TITULAR" && user.status === "ACTIVE";
  const owners = useQuery({
    queryKey: queryKeys.users({ role: "TITULAR", status: "ACTIVE", pageSize: 1 }),
    queryFn: () => service.getUsers({ role: "TITULAR", status: "ACTIVE", pageSize: 1 }),
    enabled: editingOwner && !readOnly,
  });
  const protectedOwner = editingOwner && (owners.data?.total ?? 1) <= 1;
  const roleOptions = (Object.keys(userRoles) as UserRole[])
    .filter((option) => option !== "ADMINISTRADOR" || user?.role === option)
    .map((value) => ({ value, label: userRoles[value].label }));
  const save = useMutation({
    mutationFn: () => {
      const data = {
        name: name.trim(), email: email.trim(), document: document.trim(), phone: phone.trim(),
        role, permissions, status: user?.status ?? "ACTIVE",
      } satisfies Omit<User, "id" | "createdAt" | "lastAccessAt">;

      return user ? service.updateUser(user.id, data) : service.createUser(data);
    },
    onSuccess: async (saved) => {
      client.setQueryData(queryKeys.user(saved.id), saved);
      await client.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || save.isPending) return;
    if (!name.trim()) {
      toast.error("Informe o nome do usuário.");
      event.currentTarget.querySelector<HTMLInputElement>("#user-name")?.focus();
      return;
    }
    if (document !== user?.document && !isValidCPF(document)) {
      setInvalidCpf(true);
      toast.error("Informe um CPF válido.");
      event.currentTarget.querySelector<HTMLInputElement>("#user-cpf")?.focus();
      return;
    }
    save.mutate();
  }

  function changeRole(next: string) {
    const selected = roleOptions.find((option) => option.value === next);
    if (!selected || protectedOwner || selected.value === role) return;
    setRole(selected.value);
    setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[selected.value]);
  }

  return (
    <div className="grid min-w-0 max-w-4xl gap-5">
      <BackToUsers />
      <header className="grid gap-1">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">{user ? readOnly ? "Dados do usuário" : "Editar usuário" : "Novo usuário"}</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          {readOnly ? "Seu acesso de consulta permite visualizar os dados." : "Configure os dados e as permissões deste usuário na demonstração."}
        </p>
      </header>
      {save.isSuccess ? (
        <Card className="grid justify-items-center gap-3 p-6 text-center" role="status">
          <LoadingConfirmation animate />
          <h2 className="text-balance text-lg font-semibold">{user ? "Alterações salvas" : "Usuário cadastrado"}</h2>
          <p className="wrap-anywhere text-pretty text-sm text-muted-foreground">{save.data.name} está na lista de usuários da demonstração.</p>
          <Button asChild className="h-11">
            <Link href={usersPath} prefetch={false} ref={(node) => { node?.focus({ preventScroll: true }); }}>Ver usuários</Link>
          </Button>
        </Card>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <fieldset disabled={readOnly || save.isPending} className="grid min-w-0 gap-4 disabled:opacity-85">
            <Card className="min-w-0">
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-5">
                <h2 className="text-balance text-lg font-semibold">Identificação</h2>
                {user && <Badge variant={user.status === "ACTIVE" ? "success" : "secondary"}>{userStatusLabels[user.status]}</Badge>}
              </CardHeader>
              <CardContent className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="user-name" className="text-sm font-medium">Nome completo</label>
                  <Input id="user-name" autoComplete="name" required className="h-11" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="user-email" className="text-sm font-medium">E-mail corporativo</label>
                  <Input id="user-email" type="email" autoComplete="email" required className="h-11" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="user-cpf" className="text-sm font-medium">CPF</label>
                  <BrazilianInput id="user-cpf" mask="CPF" placeholder="000.000.000-00" required aria-invalid={invalidCpf || undefined}
                    className="h-11 tabular-nums aria-invalid:border-destructive!" value={document} onChange={(event) => { setDocument(event.target.value); setInvalidCpf(false); }} />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="user-phone" className="text-sm font-medium">Telefone <span className="font-normal text-muted-foreground">(opcional)</span></label>
                  <BrazilianInput id="user-phone" autoComplete="tel" mask="PHONE" placeholder="(00) 00000-0000" className="h-11 tabular-nums"
                    value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader className="space-y-0 p-5">
                <h2 className="text-balance text-lg font-semibold">Perfil e permissões</h2>
              </CardHeader>
              <CardContent className="grid gap-4 px-5 pb-5">
                <div className="grid min-w-0 gap-1.5 sm:max-w-sm">
                  <label htmlFor="user-role" className="text-sm font-medium">Perfil de acesso</label>
                  <GlideSelect id="user-role" size="lg" className="w-full" options={roleOptions} value={role} onChange={changeRole}
                    aria-describedby="user-role-description" disabled={readOnly || save.isPending || protectedOwner} />
                  <p id="user-role-description" className="text-pretty text-xs text-muted-foreground">
                    {protectedOwner ? "A conta precisa manter este titular ativo." : userRoles[role].description}
                  </p>
                </div>
                <div className="divide-y divide-border border-y">
                  {permissionGroups.map(({ key, label, action, actionLabel }) => {
                    const access: { view: boolean } & Partial<Record<AccessAction, boolean>> = permissions[key];
                    return (
                      <div key={key} className="grid grid-cols-2 items-center gap-x-3 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_10rem]">
                        <p className="col-span-2 text-sm font-medium sm:col-span-1">{label}</p>
                        <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
                          <Switch aria-label={`Visualizar ${label.toLocaleLowerCase("pt-BR")}`} checked={access.view}
                            disabled={readOnly || save.isPending}
                            onCheckedChange={(view) => setPermissions((value) => ({ ...value, [key]: { ...value[key], view } }))} />
                          Visualizar
                        </label>
                        <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
                          <Switch aria-label={`${actionLabel} (${label})`} checked={Boolean(access[action])}
                            disabled={readOnly || save.isPending}
                            onCheckedChange={(checked) => setPermissions((value) => ({ ...value, [key]: { ...value[key], [action]: checked } }))} />
                          {actionLabel}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </fieldset>
          {save.isError && <OperationFailure message={save.error.message} />}
          {!readOnly && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="outline" className="h-11"><Link href={usersPath} prefetch={false}>Cancelar</Link></Button>
              <Button type="submit" disabled={save.isPending} className="h-11">
                {save.isPending ? <LoadingIndicator /> : <Save aria-hidden="true" />}
                {save.isPending ? "Salvando…" : user ? "Salvar alterações" : "Criar usuário"}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
