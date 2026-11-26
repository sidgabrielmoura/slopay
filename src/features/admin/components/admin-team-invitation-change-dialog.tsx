"use client";

import { useRef, useState } from "react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { adminTeam, type AdminInvitationChange, type AdminTeamInvitation } from "../admin-team";

export function AdminTeamInvitationChangeDialog({ invitation, change, onClose, onChanged, restoreFocus }: {
  invitation: AdminTeamInvitation;
  change: AdminInvitationChange;
  onClose: () => void;
  onChanged: () => void;
  restoreFocus: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState("");
  const reviewed = useRef(false);
  const deleting = change.action === "DELETE";

  function handleFailure(error: unknown) {
    if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
      setFailure(error.message);
      if (error.status === 404 || error.status === 409) onChanged();
    }
  }

  if (confirming) return (
    <IntegrationConfirmationDialog scope={`admin-team-invitation:${invitation.id}:${change.action}:${change.version}`}
      title={deleting ? "Confirmar exclusão do convite" : "Confirmar cancelamento do convite"}
      description={deleting ? "Confirme sua identidade para excluir este convite." : "Confirme sua identidade para invalidar o link deste convite."}
      completed={deleting ? "Convite excluído" : "Convite cancelado"}
      options={async () => {
        try {
          return await adminTeam.invitationOptions(invitation.id, change);
        } catch (error) {
          handleFailure(error);
          throw error;
        }
      }}
      apply={async (proof) => {
        setFailure("");
        try {
          return await adminTeam.changeInvitation(invitation.id, change, proof);
        } catch (error) {
          handleFailure(error);
          throw error;
        }
      }}
      onSuccess={onChanged} onClose={onClose} restoreFocus={restoreFocus} preventOutsideClose>
      <p className="wrap-anywhere rounded-lg border border-border bg-muted/40 p-4 text-sm font-medium">{invitation.email}</p>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );

  return (
    <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md" onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (reviewed.current) setConfirming(true);
        else { restoreFocus(); onClose(); }
      }}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-balance">{deleting ? "Excluir convite" : "Cancelar convite"}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            <strong className="block wrap-anywhere text-foreground">{invitation.email}</strong>
            <span className="mt-2 block">{deleting ? "O registro será removido da lista. A trilha de auditoria guarda o histórico do convite."
              : "O link do convite será invalidado. Você poderá excluir o registro depois do cancelamento."}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="mt-0 h-11">Voltar</AlertDialogCancel>
          <Button type="button" variant="destructive" className="h-11" onClick={() => {
            reviewed.current = true;
            setReviewOpen(false);
          }}>Continuar</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
