"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { adminOperationalAccounts, operationalChangeSchema, type OperationalAccountDetail, type OperationalChange } from "../admin-operational-accounts";
import { AdminReasonField } from "./company-change-dialog";
import { CompanyField } from "./company-display";

export function OperationalAccountStatusDialog({ account, onClose, restoreFocus, onChange }: {
  account: OperationalAccountDetail; onClose: () => void; restoreFocus: () => void; onChange: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<OperationalChange>();
  const [failure, setFailure] = useState("");
  const prepared = useRef<OperationalChange>(null);
  const original = useRef({ paused: account.pausedAt !== null, version: account.version });
  const pause = !original.current.paused;
  const title = pause ? "Pausar operações Pix" : "Retomar operações Pix";

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = operationalChangeSchema.safeParse({
      paused: pause, version: original.current.version, reason: new FormData(event.currentTarget).get("reason"),
    });
    if (!input.success) { toast.error("Informe o motivo da alteração em até 600 caracteres."); return; }
    prepared.current = input.data;
    setOpen(false);
  }

  if (draft) {
    return (
      <IntegrationConfirmationDialog
        scope={`operational-account:${account.id}:${draft.version}:${draft.paused}`}
        title={pause ? "Confirmar pausa de operações" : "Confirmar retomada de operações"}
        completed={pause ? "Operações pausadas" : "Pausa removida"}
        description={account.companyName}
        options={() => adminOperationalAccounts.options(account.id, draft)}
        apply={async (proof) => {
          setFailure("");
          try {
            return await adminOperationalAccounts.change(account.id, draft, proof);
          } catch (error) {
            if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
              setFailure(error.message);
              if (error.status === 409) onChange();
            }
            throw error;
          }
        }}
        onSuccess={onChange} onClose={onClose} restoreFocus={restoreFocus}>
        <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <CompanyField label="Carteira Sandbox"><span className="tabular-nums">{account.walletSuffix}</span></CompanyField>
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
          <AlertDialogTitle className="text-balance">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            {pause
              ? "A pausa bloqueia novas cobranças, solicitações e aprovações de saque pelo Slopay. Operações já autorizadas seguem para processamento e conciliação."
              : "A retomada libera novas operações pelo Slopay, conforme o acesso do titular e a configuração da carteira."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="grid gap-4" onSubmit={review}>
          <AdminReasonField />
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" className="h-11" variant={pause ? "destructive" : "default"}>Revisar alteração</Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
