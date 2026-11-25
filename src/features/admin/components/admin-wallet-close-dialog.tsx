"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import type { PasskeyOptions } from "@/features/auth/passkey-contract";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { liveWalletCloseDraft, liveWalletPositions, type LiveWalletPosition } from "../admin-live-pool-accounts";
import { AdminReasonField } from "./company-change-dialog";

export function AdminWalletCloseDialog({ wallet, onClose, onSuccess, restoreFocus }: {
  wallet: LiveWalletPosition;
  onClose: () => void;
  onSuccess: () => void;
  restoreFocus: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const prepared = useRef("");
  const passkeyOptions = useRef<PasskeyOptions | null>(null);
  const preparing = useRef(false);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preparing.current) return;
    const input = liveWalletCloseDraft.safeParse({ reason: new FormData(event.currentTarget).get("reason") });
    if (!input.success) { setFailure("Informe o motivo do encerramento."); return; }
    preparing.current = true;
    setBusy(true);
    setFailure("");
    try {
      passkeyOptions.current = await liveWalletPositions.closeOptions(wallet.id, input.data.reason);
      prepared.current = input.data.reason;
      setOpen(false);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Não foi possível preparar o encerramento.");
    } finally {
      preparing.current = false;
      setBusy(false);
    }
  }

  if (reason) return (
    <IntegrationConfirmationDialog scope={`admin-wallet-close:${wallet.id}`}
      title="Confirmar encerramento da carteira" description="Confirme sua identidade para retirar esta carteira das operações do Slopay."
      completed="Carteira encerrada" options={() => {
        const options = passkeyOptions.current;
        passkeyOptions.current = null;
        return options ? Promise.resolve(options) : liveWalletPositions.closeOptions(wallet.id, reason);
      }}
      apply={proof => liveWalletPositions.close(wallet.id, reason, proof)}
      onSuccess={onSuccess} onClose={onClose} restoreFocus={restoreFocus}>
      <div className="grid gap-1 rounded-lg border border-border p-4 text-sm">
        <strong className="wrap-anywhere">{wallet.name}</strong>
        <p className="wrap-anywhere whitespace-pre-wrap text-muted-foreground">{reason}</p>
      </div>
    </IntegrationConfirmationDialog>
  );

  return (
    <AlertDialog open={open} onOpenChange={next => { if (!preparing.current) setOpen(next); }}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onEscapeKeyDown={event => { if (preparing.current) event.preventDefault(); }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (prepared.current) setReason(prepared.current);
          else { onClose(); restoreFocus(); }
        }}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-balance">Encerrar carteira</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            <strong className="block wrap-anywhere text-foreground">{wallet.name}</strong>
            <span className="mt-2 block">O Slopay vai conferir o saldo e as operações em aberto. A carteira encerrada continua no histórico para conciliação.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="grid gap-4" onSubmit={prepare} aria-busy={busy}>
          <AdminReasonField label="Motivo do encerramento" readOnly={busy} />
          {failure && <OperationFailure message={failure} />}
          <AlertDialogFooter>
            <AlertDialogCancel className="mt-0 h-11" disabled={busy}>Cancelar</AlertDialogCancel>
            <Button type="submit" variant="destructive" className="h-11" disabled={busy}>
              {busy && <LoadingIndicator />}{busy ? "Verificando…" : "Revisar encerramento"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
