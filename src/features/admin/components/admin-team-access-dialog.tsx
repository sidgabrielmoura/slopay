"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminAccessLevelLabels, type AdminAccessDraft } from "../admin-access";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { adminTeam, adminTeamChangeSchema, type AdminMemberDetail, type AdminTeamChange } from "../admin-team";
import { AdminReasonField } from "./company-change-dialog";
import { CompanyField } from "./company-display";
import { AdminTeamAccessFields } from "./admin-team-access-fields";

const labels = {
  SUSPEND: {
    title: "Suspender acesso",
    review: "Confirmar suspensão de acesso",
    result: "Acesso suspenso",
    description: "As sessões do membro serão encerradas e o acesso dele ao Slopay será bloqueado.",
  },
  REACTIVATE: {
    title: "Reativar acesso",
    review: "Confirmar reativação de acesso",
    result: "Acesso reativado",
    description: "O membro poderá entrar em uma nova sessão após cumprir as verificações de segurança da conta.",
  },
  EDIT_ACCESS: {
    title: "Editar membro", review: "Confirmar alterações do membro", result: "Membro atualizado",
    description: "O membro vai entrar novamente para usar o nível e as permissões atualizados.",
  },
  REMOVE: {
    title: "Excluir membro da equipe", review: "Confirmar exclusão do membro", result: "Membro excluído da equipe",
    description: "O acesso será revogado e as sessões serão encerradas. O histórico de auditoria será preservado.",
  },
} as const;

export function AdminTeamAccessDialog({ member, action, onClose, restoreFocus, onSuccess, onConflict }: {
  member: AdminMemberDetail;
  action: AdminTeamChange["action"];
  onClose: () => void;
  restoreFocus: () => void;
  onSuccess: () => void;
  onConflict: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<AdminTeamChange>();
  const [failure, setFailure] = useState("");
  const [access, setAccess] = useState<AdminAccessDraft>({ accessLevel: member.accessLevel, grants: member.grants });
  const prepared = useRef<AdminTeamChange>(null);
  const copy = labels[action];

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checked = adminTeamChangeSchema.safeParse({
      action, version: member.version, reason: form.get("reason"),
      ...(action === "EDIT_ACCESS" && { ...access, name: form.get("name") }),
    });
    if (!checked.success) {
      toast.error("Informe o motivo da alteração em até 600 caracteres.");
      return;
    }
    prepared.current = checked.data;
    setOpen(false);
  }

  if (draft) {
    return (
      <IntegrationConfirmationDialog
        scope={`admin-team:${member.id}:${draft.version}:${draft.action}`}
        title={copy.review} description={copy.description} completed={copy.result}
        options={() => adminTeam.options(member.id, draft)}
        apply={async (proof) => {
          setFailure("");
          try {
            return await adminTeam.change(member.id, draft, proof);
          } catch (error) {
            if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
              setFailure(error.message);
              if (error.status === 409) onConflict();
            }
            throw error;
          }
        }}
        onSuccess={onSuccess} onClose={onClose} restoreFocus={restoreFocus}>
        <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <CompanyField label="Membro"><strong className="font-semibold">{member.name}</strong><span className="block text-xs text-muted-foreground">{member.email}</span></CompanyField>
          {draft.accessLevel && <CompanyField label="Novo nível">
            {adminAccessLevelLabels[draft.accessLevel]}{(draft.grants?.length ?? 0) > 0 && ` · ${draft.grants?.length} permissões extras`}
          </CompanyField>}
          <CompanyField label="Motivo"><span className="whitespace-pre-wrap">{draft.reason}</span></CompanyField>
        </dl>
        {failure && <OperationFailure message={failure} />}
      </IntegrationConfirmationDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (prepared.current) {
            setDraft(prepared.current);
            prepared.current = null;
          } else {
            onClose();
            restoreFocus();
          }
        }}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-balance">{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            <strong className="block wrap-anywhere font-semibold text-foreground">{member.name}</strong>
            <span className="mt-1 block">{copy.description}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="grid gap-4" onSubmit={review}>
          {action === "EDIT_ACCESS" && <>
            <label className="grid gap-2 text-sm font-medium">
              Nome do membro
              <Input name="name" defaultValue={member.name} className="h-11" minLength={2} maxLength={150} required />
            </label>
            <AdminTeamAccessFields draft={access} onChange={setAccess} />
          </>}
          <AdminReasonField />
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" className="h-11" variant={action === "SUSPEND" || action === "REMOVE" ? "destructive" : "default"}>Revisar alteração</Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
