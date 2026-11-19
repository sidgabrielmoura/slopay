"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { adminClientUsers, clientUserDeletionSchema, type ClientUserDeletion, type ClientUserDeletionOptions } from "../admin-client-users";
import { AdminReasonField } from "./company-change-dialog";
import { CompanyField } from "./company-display";

type Target = { id: string; name: string; email: string; version: number; operation: "delete" | "close" };
type PreparedDeletion = { input: ClientUserDeletion; authorization: ClientUserDeletionOptions };

function ConfirmClientDeletion({ target, review, onClose, onDeleted, onChanged }: {
  target: Target; review: PreparedDeletion; onClose: () => void; onDeleted: () => void; onChanged: () => void;
}) {
  const current = useRef(review.authorization);
  const readInitialOptions = useRef(false);
  const [failure, setFailure] = useState("");
  const closing = target.operation === "close";
  const prepareOptions = closing ? adminClientUsers.closeOptions : adminClientUsers.deleteOptions;
  const apply = closing ? adminClientUsers.close : adminClientUsers.remove;

  return (
    <IntegrationConfirmationDialog
      scope={`admin-client-user-delete:${target.id}:${target.version}`}
      title={closing ? "Confirmar encerramento" : "Confirmar exclusão"}
      description={closing ? "Confirme sua identidade para encerrar o acesso no Slopay."
        : "A exclusão é definitiva. Confirme sua identidade para excluir esta conta do Slopay."}
      completed={closing ? "Acesso encerrado" : "Conta excluída"}
      options={async () => {
        if (readInitialOptions.current) current.current = await prepareOptions(target.id, review.input);
        readInitialOptions.current = true;
        return current.current;
      }}
      apply={async (proof) => {
        setFailure("");
        try {
          await apply(target.id, review.input, current.current.confirmation, proof);
        } catch (error) {
          if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
            setFailure(error.message);
            if (error.status === 404 || error.status === 409) onChanged();
          }
          throw error;
        }
      }}
      onSuccess={onDeleted} onClose={onClose}>
      <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <CompanyField label="Conta"><strong className="block font-semibold">{target.name}</strong>{target.email}</CompanyField>
        <CompanyField label="Motivo"><span className="whitespace-pre-wrap">{review.input.reason}</span></CompanyField>
      </dl>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );
}

export function AdminClientUserDeleteDialog({ target, onClose, onDeleted, onChanged }: {
  target: Target; onClose: () => void; onDeleted: () => void; onChanged: () => void;
}) {
  const closing = target.operation === "close";
  const [open, setOpen] = useState(true);
  const [review, setReview] = useState<PreparedDeletion>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const prepared = useRef<PreparedDeletion>(null);
  const preparing = useRef(false);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preparing.current) return;
    const parsed = clientUserDeletionSchema.safeParse({
      version: target.version, reason: new FormData(event.currentTarget).get("reason"),
    });
    if (!parsed.success) { toast.error("Informe o motivo em até 600 caracteres."); return; }

    preparing.current = true;
    setBusy(true);
    setFailure("");
    try {
      const authorization = await (closing ? adminClientUsers.closeOptions : adminClientUsers.deleteOptions)(target.id, parsed.data);
      prepared.current = { input: parsed.data, authorization };
      setOpen(false);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Não foi possível preparar a operação.");
      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) onChanged();
    } finally {
      preparing.current = false;
      setBusy(false);
    }
  }

  if (review) {
    return <ConfirmClientDeletion target={target} review={review} onClose={onClose} onDeleted={onDeleted} onChanged={onChanged} />;
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!preparing.current) setOpen(next); }}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onEscapeKeyDown={(event) => { if (preparing.current) event.preventDefault(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (prepared.current) {
            setReview(prepared.current);
            prepared.current = null;
          } else onClose();
        }}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-balance">{closing ? "Encerrar acesso" : "Excluir conta"}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            <strong className="block wrap-anywhere text-foreground">{target.name}</strong>
            <span className="block wrap-anywhere">{target.email}</span>
            <span className="mt-2 block">{closing
              ? "O Slopay revoga as sessões do titular e da equipe e bloqueia novas operações. A carteira e as transações ficam registradas para conciliação."
              : "O cadastro e os dados de acesso serão excluídos. O titular poderá se cadastrar novamente."}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="grid min-w-0 gap-4" onSubmit={prepare} aria-busy={busy}>
          <AdminReasonField label={closing ? "Motivo do encerramento" : "Motivo da exclusão"} readOnly={busy} />
          {failure && <OperationFailure message={failure} />}
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-11" disabled={busy}>Cancelar</AlertDialogCancel>
            <Button type="submit" variant="destructive" className="h-11" disabled={busy}>
              {busy && <LoadingIndicator />}
              {busy ? "Preparando…" : closing ? "Revisar encerramento" : "Revisar exclusão"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
