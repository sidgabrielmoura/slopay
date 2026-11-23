"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, LockKeyhole, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { UserIdentity } from "@/features/users/components/user-identity";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { openingsPath } from "../account-openings";
import { adminClientUsers, clientUserRoleLabels, type ClientUserDetail } from "../admin-client-users";
import { companiesPath, refreshAdminCompanyData } from "../admin-companies";
import { retryAdminRead } from "../admin-query";
import { AdminClientUserDeleteDialog } from "./admin-client-user-delete-dialog";
import { AdminDetailsDialog } from "./admin-details-dialog";
import { AdminMemberLogin } from "./admin-team-member-display";
import { CompanyAccessDialog, type CompanyAccessTarget } from "./company-change-dialog";
import { CompanyAccessBadge, CompanyField, CompanyReadError } from "./company-display";

function ClientUserFacts({ detail }: { detail: ClientUserDetail }) {
  return (
    <div className="grid min-w-0 gap-4">
      <dl className="grid min-w-0 gap-x-5 gap-y-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
        <CompanyField label="Perfil">{clientUserRoleLabels[detail.role]}</CompanyField>
        <CompanyField label="Empresa">{detail.company ? detail.company.tradeName ?? detail.company.legalName : "Sem empresa cadastrada"}</CompanyField>
        {detail.sandboxPilot && <CompanyField label="Carteira Pix">Piloto do Sandbox</CompanyField>}
        <CompanyField label="Cadastro"><time dateTime={detail.createdAt} className="tabular-nums">{formatDateTime(detail.createdAt, "date-only")}</time></CompanyField>
        <CompanyField label="Último login"><AdminMemberLogin lastLoginAt={detail.lastLoginAt} /></CompanyField>
        {detail.cpfEnding && <CompanyField label="CPF"><span className="tabular-nums">Final {detail.cpfEnding}</span></CompanyField>}
        {detail.phoneEnding && <CompanyField label="Telefone"><span className="tabular-nums">Final {detail.phoneEnding}</span></CompanyField>}
      </dl>
      <section className="grid min-w-0 gap-3" aria-labelledby="client-user-security">
        <h3 id="client-user-security" className="text-balance text-sm font-semibold">Verificações de segurança</h3>
        <dl className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
          <CompanyField label="E-mail">{detail.emailVerified ? "Confirmado" : "Pendente"}</CompanyField>
          <CompanyField label="Autenticador">{detail.mfaEnabled ? "Ativo" : "Pendente"}</CompanyField>
          <CompanyField label="Chave de acesso">{detail.passkeyRegistered ? "Cadastrada" : "Sem cadastro"}</CompanyField>
        </dl>
      </section>
    </div>
  );
}

export function AdminClientUserDialog({ adminId, id, open, onOpenChange, onCloseAutoFocus, onDeleted }: {
  adminId: string; id: string; open: boolean;
  onOpenChange: (open: boolean) => void; onCloseAutoFocus: (event: Event) => void;
  onDeleted: () => void;
}) {
  const client = useQueryClient();
  const actionButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const identity = useRef<HTMLDivElement>(null);
  const [selectedAction, setSelectedAction] = useState<CompanyAccessTarget | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<{
    id: string; name: string; email: string; version: number; operation: "delete" | "close";
  } | null>(null);
  const removed = useRef(false);
  const result = useQuery({
    queryKey: ["admin-client-user", adminId, id], queryFn: ({ signal }) => adminClientUsers.detail(id, signal),
    staleTime: 10_000, retry: retryAdminRead,
  });
  const status = result.error instanceof ApiError ? result.error.status : undefined;
  const detail = status && [401, 403, 404].includes(status) ? undefined : result.data;
  const deletion = detail?.deletion;
  const access = detail?.company && detail.accessVersion !== null && (detail.status === "ACTIVE" || detail.status === "SUSPENDED") ? {
    ...detail.company, profileVersion: detail.accessVersion, owner: { fullName: detail.name, status: detail.status },
  } : null;

  function restoreActionFocus() {
    if (actionButton.current && !actionButton.current.disabled) actionButton.current.focus();
    else identity.current?.focus();
  }

  function closeDeletion() {
    setDeletionTarget(null);
    if (removed.current) {
      onDeleted();
      onOpenChange(false);
      refreshAdminCompanyData(client, adminId);
    } else if (deleteButton.current && !deleteButton.current.disabled) {
      deleteButton.current.focus();
    } else identity.current?.focus();
  }

  return (
    <AdminDetailsDialog open={open} onOpenChange={onOpenChange} onCloseAutoFocus={onCloseAutoFocus}
      title="Detalhes do usuário" description="Perfil, vínculo e situação de acesso ao Slopay.">
      <ToastNotice message={status !== 404 ? result.error?.message : null} />
      {result.isPending && <span role="status" className="sr-only">Carregando usuário</span>}
      <SkeletonReveal flow revealed={!result.isPending} skeleton={
        <div className="grid min-w-0 gap-4"><Skeleton className="h-10 w-2/3 animate-none" /><Skeleton className="h-44 animate-none" /></div>
      }>
        {detail ? (
          <div className="grid min-w-0 gap-4">
            <div ref={identity} tabIndex={-1} className="flex min-w-0 flex-wrap items-start justify-between gap-3 outline-none">
              <UserIdentity name={detail.name} email={detail.email} />
              {detail.closedAt ? <Badge variant="secondary">Acesso encerrado</Badge> : <CompanyAccessBadge status={detail.status} />}
            </div>
            <ClientUserFacts detail={detail} />
            {(detail.company || detail.role === "MERCHANT") && <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              {detail.company ? <Button asChild variant="ghost" className="h-11">
                <Link href={`${companiesPath}/${detail.company.id}`} prefetch={false}>Ver empresa <ArrowUpRight aria-hidden="true" /></Link>
              </Button> : detail.role === "MERCHANT" && <Button asChild variant="ghost" className="h-11">
                <Link href={`${openingsPath}/${detail.id}`} prefetch={false}>Ver abertura da conta <ArrowUpRight aria-hidden="true" /></Link>
              </Button>}
              {access && <Button type="button" variant="outline" ref={actionButton} className="h-11" disabled={result.isError}
                aria-haspopup="dialog" onClick={() => setSelectedAction(access)}>
                {access.owner.status === "ACTIVE" ? "Suspender acesso" : "Reativar acesso"}
              </Button>}
            </div>}
            {deletion && (
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                {"version" in deletion ? (
                  <Button type="button" ref={deleteButton} variant="destructive" className="h-11"
                    disabled={result.isError} aria-haspopup="dialog"
                    onClick={() => setDeletionTarget({ id, name: detail.name, email: detail.email, version: deletion.version, operation: "delete" })}>
                    <Trash2 aria-hidden="true" />Excluir conta
                  </Button>
                ) : (
                  <div className="grid min-w-0 gap-1 text-pretty text-sm text-muted-foreground">
                    <h3 className="text-balance font-semibold text-foreground">Exclusão indisponível</h3>
                    {detail.sandboxPilot && <p>Este cadastro é o titular da carteira piloto do Sandbox.</p>}
                    {deletion.blocked === "LINKED" && (detail.company || !detail.sandboxPilot) &&
                      <p>O cadastro tem um vínculo operacional.</p>}
                    {(deletion.blocked === "HISTORY" || deletion.hasFinancialHistory) &&
                      <p>Há movimentações financeiras vinculadas a este cadastro.</p>}
                    {detail.closureFinancialPending && <p>Regularize o saldo e as operações em aberto para encerrar a conta.</p>}
                    {detail.closedAt && <p>Encerrado em <time dateTime={detail.closedAt}>{formatDateTime(detail.closedAt, "medium")}</time>.</p>}
                    {detail.closureVersion != null && <Button type="button" ref={deleteButton} variant="outline" className="mt-2 h-11 w-fit"
                      aria-haspopup="dialog" disabled={result.isError} onClick={() => setDeletionTarget({
                        id, name: detail.name, email: detail.email, version: detail.closureVersion!, operation: "close",
                      })}><LockKeyhole aria-hidden="true" /> Encerrar acesso</Button>}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : result.isError && (status === 404 ? <p className="py-4 text-sm font-medium">Usuário não encontrado.</p>
          : <CompanyReadError title="Consulta do usuário indisponível" retry={() => void result.refetch()} />)}
      </SkeletonReveal>
      {selectedAction && <CompanyAccessDialog company={selectedAction} onChange={() => refreshAdminCompanyData(client, adminId)}
        onClose={() => setSelectedAction(null)} restoreFocus={restoreActionFocus} />}
      {deletionTarget && <AdminClientUserDeleteDialog target={deletionTarget}
        onClose={closeDeletion} onDeleted={() => {
          if (deletionTarget.operation === "delete") removed.current = true;
          else refreshAdminCompanyData(client, adminId);
        }} onChanged={() => { void result.refetch(); }} />}
    </AdminDetailsDialog>
  );
}
