"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastNotice } from "@/components/ui/toast-notice";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { formatCentsToBrl } from "@/lib/money";
import { livePoolControls, liveWalletControlDraft, type LiveWalletControlDraft, type walletControlsSchema } from "../admin-live-pool-accounts";

type Props = { poolId: string; name: string; adminId: string; onClose: () => void; restoreFocus: () => void; onChange: () => void };
type Controls = z.infer<typeof walletControlsSchema>;

export function LiveWalletControlsDialog(props: Props) {
  const { adminId, poolId, name, onClose, restoreFocus, onChange } = props;
  const [open, setOpen] = useState(true);
  const [review, setReview] = useState<LiveWalletControlDraft | null>(null);
  const [failure, setFailure] = useState("");
  const draft = useRef<LiveWalletControlDraft | null>(null);
  const token = useRef<string>(null);
  const query = useQuery({
    queryKey: ["admin-live-pool-accounts", adminId, "controls", poolId],
    queryFn: ({ signal }) => livePoolControls.wallet(poolId, signal),
    staleTime: 0,
    retry: false,
  });

  if (review) return (
    <IntegrationConfirmationDialog
      scope={"live-wallet-controls:" + poolId}
      title="Confirmar configuração da carteira"
      description="Confirme sua identidade para aplicar estas permissões."
      completed="Carteira atualizada"
      options={async () => {
        const response = await livePoolControls.options(review);
        token.current = response.confirmation;
        return response;
      }}
      apply={async (proof) => {
        setFailure("");
        try {
          const confirmation = "credential" in proof ? token.current : (await livePoolControls.options(review)).confirmation;
          if (!confirmation) throw new Error("Prepare a confirmação novamente.");
          return await livePoolControls.apply(review, confirmation, proof);
        } catch (error) {
          if (!(error instanceof ApiError) || !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
            setFailure(error instanceof Error ? error.message : "Não foi possível salvar.");
          }
          throw error;
        }
      }}
      onClose={onClose} restoreFocus={restoreFocus} onSuccess={onChange}>
      <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <h3 className="wrap-anywhere font-semibold">{name}</h3>
        <p>Recebimentos {review.receives ? "habilitados" : "pausados"}</p>
        <p>Saques {review.withdraws ? "habilitados" : "pausados"}</p>
        {review.withdraws && <p>Tarifa máxima por saque {formatCentsToBrl(review.feeLimit ?? 0)}</p>}
      </div>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (draft.current) {
            setReview(draft.current);
            draft.current = null;
          } else {
            restoreFocus();
            onClose();
          }
        }}>
        <DialogHeader className="text-left">
          <DialogTitle>Configurar carteira</DialogTitle>
          <DialogDescription className="wrap-anywhere">{name}</DialogDescription>
        </DialogHeader>
        {query.isFetching ? <Skeleton aria-label="Carregando configurações" className="h-40 w-full" /> : query.data && !query.isError ? (
          <WalletSettingsForm poolId={poolId} data={query.data} onCancel={() => setOpen(false)}
            onReview={value => { draft.current = value; setOpen(false); }} />
        ) : (
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>Tentar carregar novamente</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WalletSettingsForm({ poolId, data, onReview, onCancel }: {
  poolId: string; data: Controls; onReview: (draft: LiveWalletControlDraft) => void; onCancel: () => void;
}) {
  const id = useId();
  const [receives, setReceives] = useState(data.receives);
  const [withdraws, setWithdraws] = useState(data.withdraws);
  const [feeLimit, setFeeLimit] = useState(data.feeLimit ?? 0);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const eventsToken = String(form.get("eventsToken") ?? "").trim() || undefined;
    const validationToken = String(form.get("validationToken") ?? "").trim() || undefined;
    const result = liveWalletControlDraft.safeParse({ poolId, receives, withdraws,
      feeLimit: withdraws ? feeLimit : undefined, eventsToken, validationToken });
    if (!result.success || ((receives || withdraws) && !data.eventsConfigured && !eventsToken) ||
        (withdraws && !data.validationConfigured && !validationToken) || (eventsToken && eventsToken === validationToken)) {
      setError("Confira os tokens configurados. Use tokens distintos, de 32 a 255 caracteres, para eventos e validação de saques.");
      return;
    }
    onReview(result.data);
  }

  return (
    <form onSubmit={submit} onChange={() => setError("")} className="grid gap-4">
      <fieldset className="grid gap-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Permissões</legend>
        <label className="flex min-h-8 items-center gap-2 text-sm"><Checkbox checked={receives} onChange={e => setReceives(e.currentTarget.checked)} /> Receber Pix</label>
        <label className="flex min-h-8 items-center gap-2 text-sm"><Checkbox checked={withdraws} onChange={e => setWithdraws(e.currentTarget.checked)} /> Saques Pix</label>
        {withdraws && <div className="grid gap-2">
          <label htmlFor={id + "-fee"} className="text-sm font-medium">Tarifa máxima por saque</label>
          <CurrencyInput id={id + "-fee"} valueInCents={feeLimit} maxInCents={100000} onValueChange={setFeeLimit} />
        </div>}
      </fieldset>
      <p className="text-pretty text-sm text-muted-foreground">Use a URL pública do backend, seguida dos caminhos abaixo, na configuração da carteira no Asaas.</p>
      <div className="grid gap-2">
        <label htmlFor={id + "-events"} className="text-sm font-medium">Token do webhook de eventos</label>
        <code className="select-all wrap-anywhere text-xs text-muted-foreground">{data.eventsPath}</code>
        <Input id={id + "-events"} name="eventsToken" className="h-11" type="password" autoComplete="new-password" minLength={32} maxLength={255}
          placeholder={data.eventsConfigured ? "Configurado" : undefined} required={(receives || withdraws) && !data.eventsConfigured} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={id + "-validation"} className="text-sm font-medium">Token da validação de saques</label>
        <code className="select-all wrap-anywhere text-xs text-muted-foreground">{data.validationPath}</code>
        <Input id={id + "-validation"} name="validationToken" className="h-11" type="password" autoComplete="new-password" minLength={32} maxLength={255}
          placeholder={data.validationConfigured ? "Configurado" : undefined} required={withdraws && !data.validationConfigured} />
      </div>
      <ToastNotice message={error} />
      <DialogFooter>
        <Button type="button" variant="ghost" className="h-11" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="h-11">Revisar configuração</Button>
      </DialogFooter>
    </form>
  );
}
