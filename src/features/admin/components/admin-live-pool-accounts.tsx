"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { livePoolAccounts, livePoolDraftSchema, type LivePoolDraft } from "../admin-live-pool-accounts";

type WalletIdentity = { id: string; name: string; walletId: string };

export function LiveWalletDialog({ wallet, onClose, restoreFocus, onCreated }: {
  wallet: WalletIdentity | null; onClose: () => void; restoreFocus: () => void; onCreated: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(true);
  const pending = useRef<LivePoolDraft | null>(null);
  const latestProof = useRef<string>(null);
  const [review, setReview] = useState<LivePoolDraft | null>(null);
  const [failure, setFailure] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const result = livePoolDraftSchema.safeParse(wallet ? { ...form, name: wallet.name, walletId: wallet.walletId } : form);
    if (!result.success) {
      const field = result.error.issues[0]?.path[0];
      setFailure(field === "walletId" ? "Confira o ID da carteira." : field === "apiKey"
        ? "Informe uma chave de produção do Asaas." : "Confira o nome da carteira.");
      if (typeof field === "string") event.currentTarget.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus();
      return;
    }
    setFailure("");
    pending.current = result.data;
    setOpen(false);
  }

  const options = (draft: LivePoolDraft) => wallet ? livePoolAccounts.rotationOptions(wallet.id, draft.apiKey) : livePoolAccounts.options(draft);

  if (review) return (
    <IntegrationConfirmationDialog
      scope={`asaas-live-wallet:${review.walletId}`}
      title={wallet ? "Confirmar troca de chave" : "Confirmar cadastro da carteira"}
      description="Confirme sua identidade para verificar e guardar a credencial desta carteira."
      completed={wallet ? "Chave atualizada" : "Carteira cadastrada"}
      options={async () => {
        const response = await options(review);
        latestProof.current = response.confirmation;
        return response;
      }}
      apply={async (proof) => {
        setFailure("");
        try {
          const confirmation = "credential" in proof ? latestProof.current : (await options(review)).confirmation;
          if (!confirmation) throw new Error("Prepare a confirmação novamente.");
          if (wallet) await livePoolAccounts.rotate(wallet.id, review.apiKey, confirmation, proof);
          else await livePoolAccounts.register(review, confirmation, proof);
        } catch (error) {
          if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
            setFailure(error.message);
          }
          throw error;
        }
      }}
      onClose={onClose} restoreFocus={restoreFocus} onSuccess={onCreated}
      resultContent={<p className="text-pretty text-sm text-muted-foreground">{wallet ? "A nova chave já está registrada para esta carteira. A chave anterior pode ser revogada no Asaas." : "A credencial foi verificada. A carteira aguarda habilitação para movimentar valores."}</p>}>
      <div className="min-w-0 rounded-lg border border-border bg-muted/40 p-4">
        <p className="wrap-anywhere text-sm font-semibold">{review.name}</p>
        <p className="mt-1 wrap-anywhere text-xs tabular-nums text-muted-foreground">{review.walletId}</p>
      </div>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (pending.current) {
            setReview(pending.current);
            pending.current = null;
          } else {
            restoreFocus();
            onClose();
          }
        }}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance">{wallet ? "Trocar chave da carteira" : "Cadastrar carteira"}</DialogTitle>
          <DialogDescription className="text-pretty">{wallet ? "Informe a nova chave de produção da carteira " + wallet.name + "." : "Informe os dados de uma conta Asaas aprovada para produção."}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit} onChange={() => setFailure("")}>
          {!wallet && <>
          <div className="grid gap-2">
            <label htmlFor={id + "-name"} className="text-sm font-medium">Nome da conta</label>
            <Input id={id + "-name"} name="name" className="h-11" required maxLength={100} autoFocus />
          </div>
          <div className="grid gap-2">
            <label htmlFor={id + "-wallet"} className="text-sm font-medium">ID da carteira Asaas</label>
            <Input id={id + "-wallet"} name="walletId" className="h-11 font-mono" required maxLength={36} spellCheck={false} autoComplete="off" />
          </div>
          </>}
          <div className="grid gap-2">
            <label htmlFor={id + "-key"} className="text-sm font-medium">Chave de API do Asaas</label>
            <Input id={id + "-key"} name="apiKey" type="password" className="h-11 font-mono" autoFocus={Boolean(wallet)} required maxLength={511} spellCheck={false} autoComplete="off" />
          </div>
          <ToastNotice message={failure} />
          <DialogFooter>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="h-11">{wallet ? "Revisar troca" : "Revisar carteira"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
