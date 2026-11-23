"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { KeyRound, Plus, Settings2, Wallet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { livePoolAccounts, livePoolDraftSchema, type LivePoolDraft } from "../admin-live-pool-accounts";
import { retryAdminRead } from "../admin-query";
import { CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { LiveWalletControlsDialog } from "./live-wallet-controls-dialog";

type WalletIdentity = { id: string; name: string; walletId: string };

export function AdminLivePoolAccountList({ adminId }: { adminId: string }) {
  const [page, setPage] = useState(1);
  const [register, setRegister] = useState(false);
  const [rotation, setRotation] = useState<WalletIdentity | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const walletTrigger = useRef<HTMLButtonElement>(null);
  const [managedWallet, setManagedWallet] = useState<{ id: string; name: string } | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const client = useQueryClient();
  const key = ["admin-live-pool-accounts", adminId] as const;
  const result = useQuery({
    queryKey: [...key, page],
    queryFn: ({ signal }) => livePoolAccounts.list(page, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === adminId ? previous : undefined,
    staleTime: 15_000, retry: retryAdminRead,
  });
  const data = result.data;

  return (
    <SkeletonReveal flow revealed={!result.isPending} skeleton={<CompanyRowsSkeleton />}>
      {data ? <Card className="min-w-0 gap-0 overflow-hidden">
        <CardHeader className="items-start justify-between gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-0">
            <h2 ref={title} tabIndex={-1} className="text-balance text-lg font-semibold outline-none">Contas operacionais Asaas</h2>
            <p className="mt-1 text-pretty text-sm text-muted-foreground">Cadastre as carteiras e configure quais operações cada uma pode processar.</p>
          </div>
          {data.available && !result.isError && !result.isPlaceholderData && (
            <Button ref={trigger} type="button" className="h-11" onClick={() => setRegister(true)}>
              <Plus aria-hidden="true" />Cadastrar carteira
            </Button>
          )}
        </CardHeader>
        <ToastNotice message={result.error?.message} />
        {data.items.length ? <>
          <ul aria-busy={result.isPlaceholderData} className="divide-y divide-border border-t border-border">
            {data.items.map(account => (
              <li key={account.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="wrap-anywhere text-sm font-medium">{account.name}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    Carteira final {account.walletId.slice(-8)} · verificada em {formatDateTime(account.verifiedAt, "date-only")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {account.receives && <Badge variant="secondary">Recebimentos</Badge>}
                  {account.withdraws && <Badge variant="secondary">Saques</Badge>}
                  {!account.receives && !account.withdraws && <Badge variant="secondary">Pausada</Badge>}
                  <Button type="button" variant="outline" className="min-h-11" disabled={result.isError || result.isPlaceholderData}
                    onClick={event => { walletTrigger.current = event.currentTarget; setManagedWallet(account); }}>
                    <Settings2 aria-hidden="true" />Configurar
                  </Button>
                  {data.canRotate && <Button type="button" variant="ghost" className="min-h-11" disabled={result.isError || result.isPlaceholderData}
                    onClick={event => { walletTrigger.current = event.currentTarget; setRotation(account); }}>
                    <KeyRound aria-hidden="true" />Trocar chave
                  </Button>}
                </div>
              </li>
            ))}
          </ul>
          <TablePagination {...data.pagination} busy={result.isPlaceholderData} label="Paginação das carteiras" onPageChange={setPage} />
        </> : data.available ? (
          <Empty title="Nenhuma carteira cadastrada" description="Cadastre uma carteira aprovada no Asaas."
            className="min-h-52 animate-none rounded-none border-0 border-t" icon={<Wallet aria-hidden="true" />} />
        ) : (
          <OperationalDataUnavailable title="Cadastro de carteiras indisponível" />
        )}
      </Card> : result.isError && <CompanyReadError title="Carteiras indisponíveis" retry={() => void result.refetch()} />}
      {managedWallet && <LiveWalletControlsDialog poolId={managedWallet.id} name={managedWallet.name} adminId={adminId}
        onClose={() => setManagedWallet(null)} restoreFocus={() => (walletTrigger.current ?? title.current)?.focus()}
        onChange={() => { void client.invalidateQueries({ queryKey: key });
          void client.invalidateQueries({ queryKey: ["admin-pool-accounts", adminId] }); }} />}
      {(register || rotation) && <LiveWalletDialog wallet={rotation} onClose={() => { setRegister(false); setRotation(null); }}
        restoreFocus={() => ((rotation ? walletTrigger : trigger).current ?? title.current)?.focus()}
        onCreated={() => void client.invalidateQueries({ queryKey: key })} />}
    </SkeletonReveal>
  );
}

function LiveWalletDialog({ wallet, onClose, restoreFocus, onCreated }: {
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
