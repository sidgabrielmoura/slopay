"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import {
  merchantTeam, merchantTeamChange, merchantTeamRoleLabels, merchantTeamRoles, type MerchantTeamChange, type MerchantTeamMember,
} from "../merchant-team";
import { UserIdentity } from "./user-identity";

const roles = merchantTeamRoles.options.map(value => ({ value, label: merchantTeamRoleLabels[value] }));
const states: Record<MerchantTeamMember["state"], { label: string; variant: "secondary" | "success" | "warning" }> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  SUSPENDED: { label: "Suspenso", variant: "secondary" },
  LOCKED: { label: "Bloqueado", variant: "warning" },
  PENDING_SETUP: { label: "Cadastro pendente", variant: "warning" },
  INVITED: { label: "Convite pendente", variant: "warning" },
  EXPIRED: { label: "Convite expirado", variant: "secondary" },
};

type Edit = { mode: "INVITE"; member?: MerchantTeamMember } | { mode: "ACCESS" | "REVOKE"; member: MerchantTeamMember };
type Reviewed = { action: MerchantTeamChange; email: string; review: Awaited<ReturnType<typeof merchantTeam.options>> };

function TeamChangeForm({ edit, prepare, onClose }: {
  edit: Edit; prepare: (action: MerchantTeamChange, email: string) => Promise<void>; onClose: () => void;
}) {
  const [role, setRole] = useState(edit.member?.role ?? "OPERATOR");
  const [suspended, setSuspended] = useState(edit.member?.state === "SUSPENDED");
  const [busy, setBusy] = useState(false);
  const changing = useRef(false);
  const title = edit.mode === "INVITE" ? "Convidar colaborador" : edit.mode === "REVOKE" ? "Revogar convite" : "Alterar acesso";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changing.current) return;
    const email = edit.mode === "INVITE"
      ? String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase() : edit.member.email;
    const action = merchantTeamChange.safeParse(edit.mode === "INVITE" ? { action: edit.mode, email, role }
      : edit.mode === "REVOKE" ? { action: edit.mode, id: edit.member.id }
      : { action: edit.mode, id: edit.member.id, version: edit.member.version, role, suspended });
    if (!action.success) { toast.error("Confira os dados do colaborador."); return; }
    changing.current = true;
    setBusy(true);
    try {
      await prepare(action.data, email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar a alteração.");
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
      onCloseAutoFocus={(event) => event.preventDefault()}>
      <DialogHeader className="text-left">
        <DialogTitle className="text-balance">{title}</DialogTitle>
        <DialogDescription className="text-pretty">{edit.mode === "INVITE"
          ? "O convite será enviado por e-mail e poderá ser aceito em até 48 horas."
          : edit.member.email}</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4" aria-busy={busy} onSubmit={submit}>
        {edit.mode === "INVITE" && <label className="grid gap-1.5 text-sm font-medium">
          E-mail <Input type="email" name="email" defaultValue={edit.member?.email} className="h-11"
            required maxLength={254} autoComplete="email" readOnly={busy || Boolean(edit.member)} />
        </label>}
        {edit.mode !== "REVOKE" && <div className="grid gap-1.5">
          <span className="text-sm font-medium">Perfil</span>
          <GlideSelect ariaLabel="Perfil do colaborador" size="lg" options={roles} value={role} disabled={busy}
            onChange={(value) => setRole(merchantTeamRoles.parse(value))} />
          <p className="text-pretty text-sm text-muted-foreground">{role === "OPERATOR"
            ? "Consulta movimentações e emite cobranças Pix quando a conta estiver habilitada."
            : "Consulta movimentações e indicadores da conta."}</p>
        </div>}
        {edit.mode === "ACCESS" && <div className="grid gap-1.5">
          <span className="text-sm font-medium">Acesso</span>
          <GlideSelect ariaLabel="Situação do acesso" size="lg" value={suspended ? "SUSPENDED" : "ACTIVE"}
            disabled={busy} options={[{ value: "ACTIVE", label: "Habilitado" }, { value: "SUSPENDED", label: "Suspenso" }]}
            onChange={(value) => setSuspended(value === "SUSPENDED")} />
        </div>}
        {edit.mode === "REVOKE" && <p className="text-pretty text-sm">O link de cadastro será invalidado.</p>}
        <Button type="submit" disabled={busy} className="h-11 justify-self-end">{busy && <LoadingIndicator />} Revisar</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function TeamChangeConfirmation({ reviewed, onClose, onSuccess }: {
  reviewed: Reviewed; onClose: () => void; onSuccess: () => void;
}) {
  const { action, email, review } = reviewed;
  const authorization = useRef(review);
  const initialOptionsRead = useRef(false);
  const [failure, setFailure] = useState("");

  return <IntegrationConfirmationDialog
    scope={`merchant-team:${action.action}`} title="Confirmar alteração"
    description="Confirme sua identidade para registrar a alteração da equipe."
    completed={action.action === "INVITE" ? "Convite registrado" : action.action === "REVOKE" ? "Convite revogado" : "Acesso atualizado"}
    options={async () => {
      if (initialOptionsRead.current) authorization.current = await merchantTeam.options(action);
      initialOptionsRead.current = true;
      return authorization.current;
    }}
    apply={async (proof) => {
      setFailure("");
      try {
        return await merchantTeam.apply(action, proof, authorization.current.confirmation);
      } catch (error) {
        if (!(error instanceof ApiError) ||
          (error.code !== "INTEGRATION_CODE_REJECTED" && error.code !== "INTEGRATION_PASSKEY_REJECTED")) {
          setFailure(error instanceof Error ? error.message : "Não foi possível atualizar a equipe.");
        }
        throw error;
      }
    }}
    onSuccess={onSuccess} onClose={onClose}>
    <p className="wrap-anywhere text-sm font-semibold">{email}</p>
    {action.action !== "REVOKE" && <p className="text-sm text-muted-foreground">
      {merchantTeamRoleLabels[action.role]}
      {action.action === "ACCESS" && (action.suspended ? " · Suspender acesso" : " · Habilitar acesso")}
    </p>}
    {failure && <OperationFailure message={failure} />}
  </IntegrationConfirmationDialog>;
}

export function MerchantTeamScreen({ ownerId, canManage = true }: { ownerId: string; canManage?: boolean }) {
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Edit>();
  const [reviewed, setReviewed] = useState<Reviewed>();
  const origin = useRef<HTMLElement | null>(null);
  const inviteButton = useRef<HTMLButtonElement>(null);
  const report = useQuery({
    queryKey: ["merchant-team", ownerId, page],
    queryFn: ({ signal }) => merchantTeam.list(page, signal),
    staleTime: 10_000, retry: false,
  });
  const entries = report.data;

  function open(event: MouseEvent<HTMLButtonElement>, view: Edit) {
    origin.current = event.currentTarget;
    setEdit(view);
  }
  function restoreFocus() {
    const target = origin.current?.isConnected ? origin.current : inviteButton.current;
    if (target) window.requestAnimationFrame(() => target.focus());
  }

  return <>
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="grid gap-1">
          <h2 className="text-balance text-lg font-semibold">Equipe</h2>
          <p className="text-pretty text-sm text-muted-foreground">Gerencie convites e perfis de acesso à sua conta.</p>
        </div>
        {canManage && <Button ref={inviteButton} type="button" className="h-11" onClick={(event) => open(event, { mode: "INVITE" })}>
          <Plus aria-hidden="true" /> Convidar colaborador
        </Button>}
      </div>
      <SkeletonReveal flow revealed={!report.isPending} skeleton={<Skeleton className="m-5 h-44 animate-none" />}>
        {report.isError ? <div className="grid justify-items-start gap-3 p-5">
          <OperationFailure message="Não foi possível consultar a equipe." />
          <Button type="button" variant="outline" onClick={() => void report.refetch()}>Tentar novamente</Button>
        </div> : entries && <>
          {entries.items.length ? <ul aria-label="Colaboradores e convites" className="divide-y divide-border">
            {entries.items.map((member) => {
              const state = states[member.state];
              const pending = member.version === null;
              return <li key={member.id} className="grid min-w-0 items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:p-5">
                <UserIdentity name={member.name ?? "Convidado"} email={member.email} />
                <div className="grid justify-items-start gap-1">
                  <Badge variant={state.variant}>{state.label}</Badge>
                  <span className="text-xs text-muted-foreground">{merchantTeamRoleLabels[member.role]}</span>
                </div>
                {canManage && <div className="flex flex-wrap gap-1 sm:justify-end">
                  {pending && <Button type="button" variant="ghost" className="h-11"
                    onClick={(event) => open(event, { mode: "INVITE", member })}>Reenviar</Button>}
                  {member.state !== "LOCKED" && <Button type="button" variant="outline" className="h-11"
                    onClick={(event) => open(event, { mode: pending ? "REVOKE" : "ACCESS", member })}>
                    {pending ? "Revogar" : "Alterar acesso"}
                  </Button>}
                </div>}
              </li>;
            })}
          </ul> : <Empty icon={<Users aria-hidden="true" />} className="rounded-none border-0"
            title="Nenhum colaborador" description="Convide alguém para consultar a conta ou emitir cobranças." />}
          <TablePagination {...entries.pagination} busy={report.isFetching} label="Paginação da equipe" onPageChange={setPage} />
        </>}
      </SkeletonReveal>
    </Card>
    {canManage && edit && <TeamChangeForm edit={edit} onClose={() => { setEdit(undefined); restoreFocus(); }}
      prepare={async (action, email) => {
        const review = await merchantTeam.options(action);
        setEdit(undefined);
        setReviewed({ action, email, review });
      }} />}
    {canManage && reviewed && <TeamChangeConfirmation reviewed={reviewed} onSuccess={() => { void report.refetch(); }}
      onClose={() => { setReviewed(undefined); restoreFocus(); }} />}
  </>;
}
