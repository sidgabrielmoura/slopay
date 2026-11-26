"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterInput, FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import type { User, UserRole, UserStatus } from "@/types/domain";
import { newUserPath, userRoles, usersPath, userStatusLabels } from "../user-access";
import { UserIdentity } from "./user-identity";

const roleOptions = [
  { value: "ALL", label: "Todos os perfis" },
  ...Object.entries(userRoles).map(([value, role]) => ({ value, label: role.label })),
];
const statusOptions = [
  { value: "ALL", label: "Todos os status" },
  ...Object.entries(userStatusLabels).map(([value, label]) => ({ value, label })),
];
const activeOwnerFilter = { role: "TITULAR", status: "ACTIVE", pageSize: 1 } as const;
const rowLayout = "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1fr)_7rem_4rem_7.5rem_5.5rem] lg:gap-x-4";

function UsersSkeleton() {
  return (
    <ul className="divide-y divide-border" aria-label="Carregando usuários" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} aria-hidden="true" className={rowLayout}>
          <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid min-w-0 gap-2">
              <Skeleton className="h-3 w-28 max-w-full" />
              <Skeleton className="h-3 w-36 max-w-full" />
            </div>
          </div>
          <Skeleton className="hidden h-4 w-16 lg:block" />
          <Skeleton className="hidden h-4 w-12 lg:block" />
          <Skeleton className="hidden h-3 w-24 lg:block" />
          <Skeleton className="h-4 w-20 lg:hidden" />
          <Skeleton className="h-7 w-12 justify-self-end" />
        </li>
      ))}
    </ul>
  );
}

export function UsersListScreen() {
  const service = useGatewayService();
  const { currentUser, isReadOnly, activeScenario } = useDemoScenario();
  const client = useQueryClient();
  const filterRef = useRef<HTMLButtonElement>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "ALL">("ALL");
  const [status, setStatus] = useState<UserStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<User | null>(null);
  const filters = {
    search: search.trim(), role: role === "ALL" ? undefined : role,
    status: status === "ALL" ? undefined : status, page, scenario: activeScenario,
  };
  const list = useQuery({
    queryKey: queryKeys.users(filters),
    queryFn: () => service.getUsers(filters),
    placeholderData: keepPreviousData,
  });
  const owners = useQuery({
    queryKey: queryKeys.users({ ...activeOwnerFilter, scenario: activeScenario }),
    queryFn: () => service.getUsers(activeOwnerFilter),
    enabled: !isReadOnly,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!(await service.deleteUser(id))) throw new Error("Usuário não encontrado.");
      return id;
    },
    onSuccess: async (id) => {
      client.removeQueries({ queryKey: queryKeys.user(id) });
      await client.invalidateQueries({ queryKey: queryKeys.users() });
    },
  });

  const data = list.data;
  const filtered = Boolean(filters.search || filters.role || filters.status);

  const defaults = { search: "", role: "ALL" as const, status: "ALL" as const };

  function applyFilters(draft: { search: string; role: typeof role; status: typeof status }) {
    setSearch(draft.search.trim());
    setRole(draft.role);
    setStatus(draft.status);
    setPage(1);
  }

  const clearFilters = () => applyFilters(defaults);

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Usuários</h1>
          <p className="text-pretty text-sm text-muted-foreground">Consulte os colaboradores e seus perfis de acesso.</p>
        </div>
        {!isReadOnly && (
          <Button asChild className="h-11 w-full sm:w-auto">
            <Link href={newUserPath} prefetch={false}><Plus aria-hidden="true" /> Novo usuário</Link>
          </Button>
        )}
      </header>

      <Card className="min-w-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-4 sm:p-5">
          <div className="grid gap-1">
            <h2 className="text-balance text-lg font-semibold">Colaboradores</h2>
            <p className="text-xs text-muted-foreground tabular-nums" role="status">
              {list.isPlaceholderData ? "Atualizando resultados…" : data && !list.isError
                ? `${data.total} ${data.total === 1 ? "usuário" : "usuários"}`
                : null}
            </p>
          </div>
          <FilterSheet value={{ search, role, status }} defaults={defaults} active={filtered} onApply={applyFilters} triggerRef={filterRef}>
            {(draft, setDraft) => <>
              <FilterInput label="Buscar usuários" placeholder="Nome, e-mail ou CPF" value={draft.search}
                onChange={event => setDraft({ ...draft, search: event.target.value })} />
              <FilterSelect label="Perfil" options={roleOptions} value={draft.role}
                onChange={role => setDraft({ ...draft, role: role as typeof draft.role })} />
              <FilterSelect label="Situação" options={statusOptions} value={draft.status}
                onChange={status => setDraft({ ...draft, status: status as typeof draft.status })} />
            </>}
          </FilterSheet>
        </CardHeader>

        <div className="border-t" aria-busy={list.isFetching}>
          {list.isPending ? <UsersSkeleton /> : list.isError ? (
            <div className="grid justify-items-start gap-3 p-4 sm:p-5">
              <OperationFailure message="Não foi possível carregar os usuários." animate={false} />
              <Button type="button" variant="outline" className="h-11" onClick={() => void list.refetch()}>Tentar novamente</Button>
            </div>
          ) : data?.data.length ? (
            <>
              <div aria-hidden="true" className={cn(rowLayout, "hidden border-b bg-muted/50 text-xs font-medium text-muted-foreground lg:grid")}>
                <span>Usuário</span><span>Perfil</span><span>Status</span><span>Último acesso</span><span className="text-right">Ações</span>
              </div>
              <ul className="divide-y divide-border" aria-label="Usuários encontrados">
                {data.data.map((user) => {
                  const protectedOwner = user.role === "TITULAR" && user.status === "ACTIVE" && (owners.data?.total ?? 1) <= 1;
                  const label = isReadOnly ? "Ver" : "Editar";
                  return (
                    <li key={user.id} className={rowLayout}>
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <UserIdentity name={user.name} email={user.email} current={user.id === currentUser?.id} />
                      </div>
                      <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-2 lg:contents">
                        <span className="text-sm text-muted-foreground">{userRoles[user.role].label}</span>
                        <Badge variant={user.status === "ACTIVE" ? "success" : "secondary"} className="justify-self-start">
                          {userStatusLabels[user.status]}
                        </Badge>
                      </div>
                      <time dateTime={user.lastAccessAt} className="col-start-1 row-start-3 text-xs text-muted-foreground tabular-nums lg:col-auto lg:row-auto">
                        <span className="lg:sr-only">Último acesso </span>{formatDateTime(user.lastAccessAt, "short")}
                      </time>
                      <div className="col-start-2 row-span-2 row-start-2 flex justify-end lg:col-auto lg:row-auto">
                        <Button asChild variant="ghost" size="icon" className="size-11">
                          <Link href={`${usersPath}/${encodeURIComponent(user.id)}`} prefetch={false} aria-label={`${label} ${user.name}`}>
                            {isReadOnly ? <ChevronRight aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                          </Link>
                        </Button>
                        {!isReadOnly && (
                          <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive"
                            aria-label={`Remover ${user.name}`} title={protectedOwner ? "A conta precisa manter pelo menos um titular ativo." : undefined}
                            disabled={protectedOwner || list.isPlaceholderData}
                            onClick={(event) => {
                              removeTrigger.current = event.currentTarget;
                              remove.reset();
                              setTarget(user);
                            }}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {data.totalPages > 1 && (
                <nav aria-label="Páginas de usuários" className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
                  <p className="text-xs text-muted-foreground tabular-nums">Página {data.page} de {data.totalPages}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Página anterior"
                      disabled={data.page <= 1 || list.isPlaceholderData} onClick={() => setPage(data.page - 1)}><ChevronLeft aria-hidden="true" /></Button>
                    <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Próxima página"
                      disabled={data.page >= data.totalPages || list.isPlaceholderData} onClick={() => setPage(data.page + 1)}><ChevronRight aria-hidden="true" /></Button>
                  </div>
                </nav>
              )}
            </>
          ) : (
            <Empty icon={<Users aria-hidden="true" />} className="rounded-none border-0"
              title={filtered ? "Nenhum usuário encontrado" : "Nenhum colaborador cadastrado"}
              description={filtered ? "Ajuste a busca ou os filtros." : undefined}
              action={filtered ? <Button type="button" variant="outline" className="h-11" onClick={clearFilters}>Limpar filtros</Button>
                : !isReadOnly ? <Button asChild className="h-11"><Link href={newUserPath} prefetch={false}>Novo usuário</Link></Button> : undefined} />
          )}
        </div>
      </Card>

      <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !remove.isPending) setTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md"
          onEscapeKeyDown={(event) => { if (remove.isPending) event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = removeTrigger.current;
            if (trigger?.isConnected && !trigger.disabled) trigger.focus();
            else filterRef.current?.focus();
          }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance">{remove.isSuccess ? "Usuário removido" : "Remover usuário?"}</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere text-pretty">
              {remove.isSuccess
                ? `O cadastro de ${target?.name} foi removido da demonstração.`
                : `O cadastro de ${target?.name} (${target?.email}) será removido da demonstração.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.isSuccess && <div className="justify-self-center"><LoadingConfirmation animate /></div>}
          {remove.isError && <OperationFailure message={remove.error.message} />}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={remove.isPending}>
              {remove.isSuccess ? "Fechar" : "Cancelar"}
            </AlertDialogCancel>
            {!remove.isSuccess && (
              <Button type="button" variant="destructive" className="h-11" disabled={remove.isPending || isReadOnly}
                onClick={() => { if (target) remove.mutate(target.id); }}>
                {remove.isPending && <LoadingIndicator />}
                {remove.isPending ? "Removendo…" : "Remover usuário"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
