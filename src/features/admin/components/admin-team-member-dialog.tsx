"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { retryAdminRead } from "../admin-query";
import {
  adminMemberKey, adminTeam, adminTeamKey,
  type AdminMemberAccessEvent, type AdminMemberDetail, type AdminTeamChange,
} from "../admin-team";
import { AdminDetailsDialog } from "./admin-details-dialog";
import { AdminTeamAccessDialog } from "./admin-team-access-dialog";
import { adminAccessLevelLabels } from "../admin-access";
import { AdminMemberLogin, AdminMemberStatus } from "./admin-team-member-display";
import { CompanyField, CompanyReadError } from "./company-display";

const count = new Intl.NumberFormat("pt-BR");

function MemberAccessInfo({ member }: { member: AdminMemberDetail }) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Card className="grid min-w-0 content-start gap-4 p-4 sm:p-5" aria-labelledby="admin-member-access">
        <div className="flex items-center gap-2.5">
          <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <h2 id="admin-member-access" className="text-balance text-lg font-semibold">Acesso ao painel</h2>
        </div>
        <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-4">
          <CompanyField label="Nível">{adminAccessLevelLabels[member.accessLevel]}</CompanyField>
          <CompanyField label="Permissões extras">{count.format(member.grants.length)}</CompanyField>
          <CompanyField label="Último login"><AdminMemberLogin lastLoginAt={member.lastLoginAt} /></CompanyField>
          <CompanyField label="Sessões com acesso"><span className="font-semibold tabular-nums">{count.format(member.activeSessions)}</span></CompanyField>
        </dl>
      </Card>
      <Card className="grid min-w-0 content-start gap-4 p-4 sm:p-5" aria-labelledby="admin-member-security">
        <div className="flex items-center gap-2.5">
          <LockKeyhole aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <h2 id="admin-member-security" className="text-balance text-lg font-semibold">Segurança da conta</h2>
        </div>
        <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-4">
          <CompanyField label="E-mail">{member.emailVerified ? "Confirmado" : "Confirmação pendente"}</CompanyField>
          <CompanyField label="Verificação em duas etapas">{member.mfaEnabled ? "Ativa" : "Pendente"}</CompanyField>
          <CompanyField label="Chave de acesso">{member.passkeyRegistered ? "Cadastrada" : "Sem cadastro"}</CompanyField>
          <CompanyField label="Conta criada em"><time dateTime={member.createdAt} className="tabular-nums">{formatDateTime(member.createdAt, "date-only")}</time></CompanyField>
        </dl>
      </Card>
    </div>
  );
}

function AccessHistory({ events }: { events: AdminMemberAccessEvent[] }) {
  if (!events.length) {
    return <p className="px-4 py-7 text-pretty text-sm text-muted-foreground sm:px-5">Nenhuma alteração de acesso registrada.</p>;
  }

  return (
    <ol className="divide-y divide-border" aria-label="Alterações de acesso">
      {events.map((event) => {
        const label = { SUSPEND: "Acesso suspenso", REACTIVATE: "Acesso reativado", EDIT_ACCESS: "Membro atualizado", REMOVE: "Membro excluído" }[event.action];
        return (
          <li key={event.id} className="grid min-w-0 gap-2 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold">{label}</p>
                <p className="wrap-anywhere text-xs text-muted-foreground">{event.actorName ? "Por " + event.actorName : "Autor indisponível"}</p>
              </div>
              <time dateTime={event.createdAt} className="text-xs text-muted-foreground tabular-nums">{formatDateTime(event.createdAt)}</time>
            </div>
            <p className="wrap-anywhere whitespace-pre-wrap text-pretty text-sm">{event.reason}</p>
            {event.action !== "REACTIVATE" && <p className="text-xs text-muted-foreground tabular-nums">
              {count.format(event.revokedSessions)} {event.revokedSessions === 1 ? "sessão encerrada" : "sessões encerradas"}
            </p>}
          </li>
        );
      })}
    </ol>
  );
}

type MemberDialogProps = {
  userId: string;
  memberId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
};

export function AdminTeamMemberDialog({ userId, memberId, open, onOpenChange, onCloseAutoFocus }: MemberDialogProps) {
  const [page, setPage] = useState(1);
  const removed = useRef(false);
  const client = useQueryClient();
  const [selected, setSelected] = useState<{ member: AdminMemberDetail; action: AdminTeamChange["action"] } | null>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const memberKey = adminMemberKey(userId, memberId);
  const query = useQuery({
    queryKey: [...memberKey, page],
    queryFn: ({ signal }) => adminTeam.member(memberId, page, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === userId && previous.queryKey[2] === memberId ? data : undefined,
    staleTime: 10_000, retry: retryAdminRead,
  });
  const status = query.error instanceof ApiError ? query.error.status : undefined;
  const report = status && [401, 403, 404].includes(status) ? undefined : query.data;
  const member = report?.member;
  const availableAction = member?.availableAction;
  const loadingHistory = query.isPending || query.isPlaceholderData;
  const self = userId === memberId;

  function refresh() {
    void client.invalidateQueries({ queryKey: memberKey });
    void client.invalidateQueries({ queryKey: adminTeamKey(userId) });
  }

  function restoreFocus() {
    if (changeButton.current?.isConnected) changeButton.current.focus();
    else heading.current?.focus();
  }

  return (
    <AdminDetailsDialog open={open} onOpenChange={onOpenChange} onCloseAutoFocus={onCloseAutoFocus}
      title="Detalhes do membro" description="Acesso administrativo, segurança e histórico da conta.">
      <div className="grid min-w-0 gap-5">
        <ToastNotice message={query.error?.message} />
        {query.isPending && <span role="status" className="sr-only">Carregando detalhes do membro</span>}
        <SkeletonReveal flow revealed={!query.isPending} skeleton={
          <div className="grid min-w-0 gap-5">
            <div className="grid gap-2"><Skeleton className="h-7 w-56 max-w-full animate-none" /><Skeleton className="h-3 w-40 animate-none" /></div>
            <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-40 animate-none" /><Skeleton className="h-40 animate-none" /></div>
            <Skeleton className="h-28 animate-none" />
          </div>
        }>
          {member && report ? (
            <div className="grid min-w-0 gap-5">
              <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 ref={heading} tabIndex={-1} className="min-w-0 text-balance wrap-anywhere text-xl font-semibold outline-none">{member.name}</h3>
                    <AdminMemberStatus status={member.status} />
                    {self && <Badge variant="secondary">Sua conta</Badge>}
                  </div>
                  <p className="wrap-anywhere text-sm text-muted-foreground">{member.email}</p>
                </div>
                {availableAction && (
                  <Button type="button" variant="outline" className="h-11"
                    aria-haspopup="dialog" onClick={event => {
                      changeButton.current = event.currentTarget;
                      setSelected({ member, action: availableAction });
                    }}>
                    {availableAction === "SUSPEND" ? "Suspender acesso" : "Reativar acesso"}
                  </Button>
                )}
                {member.canManage && <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="h-11" aria-haspopup="dialog" onClick={event => {
                    changeButton.current = event.currentTarget;
                    setSelected({ member, action: "EDIT_ACCESS" });
                  }}>Editar membro</Button>
                  {!member.removalProtected && <Button type="button" variant="ghost" className="h-11 text-destructive" aria-haspopup="dialog" onClick={event => {
                    changeButton.current = event.currentTarget;
                    setSelected({ member, action: "REMOVE" });
                  }}>Excluir membro</Button>}
                </div>}
                {self && <Button asChild variant="outline" className="h-11">
                  <Link href="/conta/seguranca" prefetch={false}>Minha segurança <ArrowUpRight aria-hidden="true" /></Link>
                </Button>}
              </header>
              <MemberAccessInfo member={member} />
              <Card className="min-w-0" aria-labelledby="admin-member-history">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <h2 id="admin-member-history" className="text-balance text-lg font-semibold">Histórico de acesso</h2>
                </div>
                <SkeletonReveal flow revealed={!loadingHistory} skeleton={
                  <div className="grid gap-2 px-4 py-5 sm:px-5">
                    <Skeleton className="h-4 w-36 animate-none" /><Skeleton className="h-3 w-3/5 animate-none" />
                  </div>
                }>
                  <AccessHistory events={report.history} />
                </SkeletonReveal>
                {report.pagination.total > 0 && <TablePagination {...report.pagination} busy={loadingHistory}
                  label="Paginação do histórico de acesso" onPageChange={setPage} />}
              </Card>
            </div>
          ) : query.isError && (status === 404 ? (
            <Card className="grid min-h-32 content-center px-5 py-6">
              <h3 className="text-balance text-lg font-semibold">Membro da equipe não encontrado</h3>
            </Card>
          ) : <CompanyReadError title="Consulta do membro indisponível" retry={() => void query.refetch()} />)}
        </SkeletonReveal>
      </div>
      {selected && <AdminTeamAccessDialog member={selected.member} action={selected.action}
        onClose={() => {
          setSelected(null);
          if (removed.current) onOpenChange(false);
        }}
        restoreFocus={restoreFocus} onConflict={refresh}
        onSuccess={() => {
          if (selected.action === "REMOVE") {
            removed.current = true;
            void client.invalidateQueries({ queryKey: adminTeamKey(userId) });
          } else {
            setPage(1);
            refresh();
          }
        }} />}
    </AdminDetailsDialog>
  );
}
