"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import type { IntegrationProof } from "@/features/integrations/integration-proof";
import { ApiError } from "@/lib/api-client";
import {
  poolAccountInput, poolAccounts, poolModeLabels,
  type PoolAccount, type PoolAccountChoice, type PoolAccountInput, type PoolCreateResult, type PoolMode, type PoolOwner, type PoolPolicyInput,
} from "../admin-pool-accounts";
import { livePoolControls } from "../admin-live-pool-accounts";
import { retryAdminRead } from "../admin-query";
import { CompanyField } from "./company-display";

type DialogCallbacks = { onClose: () => void; restoreFocus: () => void; onChange: () => void };
const modes = Object.entries(poolModeLabels).map(([value, label]) => ({ value, label }));
const descriptions: Record<PoolMode, string> = {
  RANDOM: "Participam do sorteio todas as contas elegíveis.",
  FIXED: "As novas operações usam exclusivamente a conta escolhida.",
  RESTRICTED: "Participam do sorteio apenas as contas elegíveis selecionadas abaixo.",
};

function EditDialog({ open, close, finishClose, title, description, review, children, disabled }: {
  open: boolean; close: () => void; finishClose: () => void;
  title: string; description: string; review: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode; disabled?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => { event.preventDefault(); finishClose(); }}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance">{title}</DialogTitle>
          <DialogDescription className="text-pretty">{description}</DialogDescription>
        </DialogHeader>
        <form className="grid min-w-0 gap-4" onSubmit={review}>
          {children}
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="outline" className="h-11" onClick={close}>Cancelar</Button>
            <Button type="submit" className="h-11" disabled={disabled}>Revisar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useFailure(onChange: () => void) {
  const [failure, setFailure] = useState("");
  async function attempt<T>(action: () => Promise<T>): Promise<T> {
    setFailure("");
    try {
      return await action();
    } catch (error) {
      if (error instanceof ApiError) {
        if (!["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
          setFailure(error.status === 409 ? `${error.message} Feche a confirmação e confira os dados atualizados.` : error.message);
        }
        if (error.status === 409) onChange();
      } else {
        setFailure("Não foi possível confirmar a operação. Confira a configuração atual antes de tentar novamente.");
      }
      throw error;
    }
  }
  return { failure, attempt };
}

export function PoolRegistrationDialog({ onClose, restoreFocus, onChange }: DialogCallbacks) {
  const id = useId();
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<{ field: string; message: string }>();
  const [draft, setDraft] = useState<Omit<PoolAccountInput, "apiKey">>();
  const [result, setResult] = useState<PoolCreateResult>();
  const prepared = useRef<PoolAccountInput>(null);
  const secret = useRef("");
  const { attempt, failure } = useFailure(onChange);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = poolAccountInput.safeParse(Object.fromEntries(form));
    if (!data.success) {
      const field = String(data.error.issues[0]?.path[0] ?? "name");
      const message = field === "walletId" ? "Informe o ID da carteira do provedor no formato UUID."
        : field === "customerId" ? "Informe o ID do pagador com o prefixo cus_."
        : field === "apiKey" ? "Confira o formato da chave de API do provedor."
        : "Informe um nome válido para a conta.";
      setError({ field, message });
      (event.currentTarget.elements.namedItem(field) as HTMLInputElement | null)?.focus();
      return;
    }
    prepared.current = data.data;
    setOpen(false);
  }

  if (draft) return (
    <IntegrationConfirmationDialog
      scope={`pool-account:create:${draft.walletId}`}
      title="Confirmar cadastro da conta bolsão" description="Após a verificação no provedor, a conta será habilitada para o roteamento."
      completed="Conta bolsão cadastrada" preventOutsideClose
      options={() => poolAccounts.registrationOptions({ ...draft, apiKey: secret.current })}
      apply={(proof) => attempt(() => poolAccounts.register({ ...draft, apiKey: secret.current }, proof))}
      onSuccess={(value) => { secret.current = ""; setResult(value); onChange(); }}
      onClose={() => { secret.current = ""; onClose(); }} restoreFocus={restoreFocus}
      resultContent={result && <WebhookCredentials result={result} />}>
      <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <CompanyField label="Conta">{draft.name}</CompanyField>
        <CompanyField label="ID da carteira">{draft.walletId}</CompanyField>
        <CompanyField label="ID do pagador">{draft.customerId}</CompanyField>
      </dl>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );

  function invalid(field: string) {
    return error?.field === field ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : undefined;
  }

  return (
    <EditDialog open={open} close={() => setOpen(false)} title="Cadastrar conta bolsão"
      description="Informe a carteira, o pagador de teste e a chave de API da conta operacional do Slopay."
      review={review} finishClose={() => {
        const value = prepared.current;
        prepared.current = null;
        if (!value) { restoreFocus(); onClose(); return; }
        const { apiKey, ...data } = value;
        secret.current = apiKey;
        setDraft(data);
      }}>
      <div className="grid gap-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">Nome da conta</label>
        <Input id={`${id}-name`} className="h-11" name="name" maxLength={100} placeholder="Ex. Operação Norte" required {...invalid("name")} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${id}-wallet`} className="text-sm font-medium">ID da carteira do provedor</label>
        <Input id={`${id}-wallet`} className="h-11 font-mono" name="walletId" maxLength={36} autoComplete="off" spellCheck={false}
          required {...invalid("walletId")} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${id}-customer`} className="text-sm font-medium">ID do pagador de teste</label>
        <Input id={`${id}-customer`} className="h-11 font-mono" name="customerId" maxLength={64} placeholder="cus_…" autoComplete="off" spellCheck={false}
          required aria-describedby={`${id}-payer-help`} {...invalid("customerId")} />
        <p id={`${id}-payer-help`} className="text-pretty text-sm text-muted-foreground">Use um pagador fictício desta conta do provedor com notificações desativadas.</p>
      </div>
      <div className="grid gap-2">
        <label htmlFor={`${id}-key`} className="text-sm font-medium">Chave de API Sandbox</label>
        <Input id={`${id}-key`} className="h-11 font-mono" name="apiKey" type="password" maxLength={512} autoComplete="off" spellCheck={false}
          required {...invalid("apiKey")} />
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-pretty text-sm text-destructive">{error.message}</p>}
    </EditDialog>
  );
}

function WebhookCredentials({ result }: { result: PoolCreateResult }) {
  const [message, setMessage] = useState("");

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(result.webhookToken);
      setMessage("Token copiado.");
    } catch {
      setMessage("Selecione o token para copiá-lo.");
    }
  }

  return (
    <div className="grid w-full min-w-0 gap-3 rounded-lg border border-border p-4">
      <h3 className="text-balance font-medium">Configurar webhook no provedor</h3>
      <p className="text-pretty text-sm text-muted-foreground">
        No ambiente de testes do provedor, abra Integrações → Webhooks. Use o endereço público do backend com o caminho abaixo e informe o token de autenticação.
      </p>
      <p className="text-pretty text-sm text-muted-foreground">O provedor envia o token no cabeçalho <code>asaas-access-token</code>. Este token aparece uma única vez.</p>
      <dl className="grid min-w-0 gap-3">
        <CompanyField label="Caminho do webhook"><code className="wrap-anywhere">{result.account.webhookPath}</code></CompanyField>
        <CompanyField label="Token do webhook">
          <code className="select-all wrap-anywhere">{result.webhookToken}</code>
        </CompanyField>
      </dl>
      <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => void copyToken()}>
        <Copy aria-hidden="true" />Copiar token
      </Button>
      {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
    </div>
  );
}

export function PoolStatusDialog({ account, onClose, restoreFocus, onChange }: DialogCallbacks & { account: PoolAccount }) {
  const active = !account.active;
  const { attempt, failure } = useFailure(onChange);
  return (
    <IntegrationConfirmationDialog
      scope={`pool-account:status:${account.id}:${active}`}
      title={active ? "Confirmar reativação" : "Confirmar pausa"}
      description={active ? "A conta volta a participar das regras de roteamento compatíveis." : "A conta sai da seleção de novos Pix. Regras sem outra conta elegível ficam indisponíveis."}
      completed={active ? "Conta reativada" : "Conta pausada"}
      options={() => poolAccounts.statusOptions(account.id, active)}
      apply={(proof) => attempt(() => poolAccounts.setStatus(account.id, active, proof))}
      onSuccess={onChange} onClose={onClose} restoreFocus={restoreFocus}>
      <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <CompanyField label="Conta">{account.name}</CompanyField>
        <CompanyField label="ID da carteira">{account.walletId}</CompanyField>
      </dl>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );
}

export function PoolPolicyDialog({ owner, adminId, development, onClose, restoreFocus, onChange }: DialogCallbacks & { owner: PoolOwner; adminId: string; development: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState(owner.mode);
  const [ids, setIds] = useState(owner.accountIds);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PoolPolicyInput>();
  const prepared = useRef<PoolPolicyInput>(null);
  const { attempt, failure } = useFailure(onChange);
  const confirmationToken = useRef<string>(null);
  const choices = useQuery({
    queryKey: ["admin-pool-accounts", adminId, "eligible", development],
    queryFn: ({ signal }) => (development ? poolAccounts : livePoolControls).eligible(signal),
    enabled: mode !== "RANDOM" && !draft,
    retry: retryAdminRead,
    staleTime: 10_000,
  });
  const accounts = choices.data?.items ?? [];
  const selected = mode === "FIXED" ? ids.slice(0, 1) : ids;

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accountIds = mode === "RANDOM" ? [] : [...selected].sort();
    if (mode === "FIXED" && accountIds.length !== 1) {
      setError("Escolha a conta fixa.");
      return;
    }
    if (mode === "RESTRICTED" && accountIds.length < 2) {
      setError("Marque pelo menos duas contas para sortear.");
      return;
    }
    const activeAccountIds = new Set(accounts.filter((account) => account.active).map((account) => account.id));
    if (accountIds.some((accountId) => !activeAccountIds.has(accountId))) {
      setError("Selecione somente contas ativas.");
      return;
    }
    prepared.current = { mode, accountIds, version: owner.version };
    setOpen(false);
  }

  if (draft) return (
    <IntegrationConfirmationDialog
      scope={`pool-account:policy:${owner.id}:${owner.version}`}
      title="Confirmar alteração de roteamento" description="A regra será usada nas próximas operações deste titular."
      completed="Roteamento atualizado"
      options={async () => {
        if (development) return poolAccounts.policyOptions(owner.id, draft);
        const response = await livePoolControls.routingOptions(owner.id, draft);
        confirmationToken.current = response.confirmation;
        return response;
      }}
      apply={(proof: IntegrationProof) => attempt(async () => {
        if (development) return poolAccounts.setPolicy(owner.id, draft, proof);
        const confirmation = "credential" in proof ? confirmationToken.current : (await livePoolControls.routingOptions(owner.id, draft)).confirmation;
        if (!confirmation) throw new Error("Prepare a confirmação novamente.");
        return livePoolControls.routingApply(owner.id, draft, confirmation, proof);
      })}
      onSuccess={onChange} onClose={onClose} restoreFocus={restoreFocus}>
      <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <CompanyField label="Titular">{owner.name}</CompanyField>
        <CompanyField label="Roteamento">{poolModeLabels[draft.mode]}</CompanyField>
        {draft.accountIds.length > 0 && <CompanyField label="Contas selecionadas">
          <ul className="grid gap-1">
            {draft.accountIds.map((accountId) => {
              const account = accounts.find((account) => account.id === accountId);
              return <li key={accountId}>{account ? `${account.name} · ${poolAccountTag(account)}` : accountId}</li>;
            })}
          </ul>
        </CompanyField>}
      </dl>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );

  return (
    <EditDialog open={open} close={() => setOpen(false)} title="Alterar roteamento" description={owner.name}
      review={review} disabled={mode !== "RANDOM" && (choices.isPending || choices.isError)} finishClose={() => {
        if (prepared.current) { setDraft(prepared.current); prepared.current = null; return; }
        restoreFocus();
        onClose();
      }}>
      <div className="grid gap-2">
        <label htmlFor={`${id}-mode`} className="text-sm font-medium">Regra de roteamento</label>
        <GlideSelect id={`${id}-mode`} size="lg" menuWidth={260} options={modes} value={mode} aria-describedby={`${id}-hint`}
          onChange={(value) => {
            setMode(value as PoolMode);
            setIds(value === owner.mode ? owner.accountIds : []);
            setError("");
          }} />
        <p id={`${id}-hint`} className="text-pretty text-sm text-muted-foreground">{descriptions[mode]}</p>
      </div>
      {mode !== "RANDOM" && (
        <SkeletonReveal flow revealed={!choices.isPending} skeleton={<Skeleton className="h-14 animate-none" />}>
          {choices.isError ? <div className="grid gap-2">
            <p role="alert" className="text-sm text-destructive">{choices.error.message}</p>
            <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => void choices.refetch()}>Tentar novamente</Button>
          </div> : !accounts.length ? <p className="text-pretty text-sm text-muted-foreground">Cadastre uma conta bolsão para usar esta regra.</p>
            : mode === "FIXED" ? (
              <div className="grid gap-2">
                <label htmlFor={`${id}-fixed`} className="text-sm font-medium">Conta fixa</label>
                <GlideSelect id={`${id}-fixed`} size="lg" menuWidth={280} value={selected[0] ?? ""}
                  options={accounts.map((account) => ({
                    value: account.id, label: account.name, tag: poolAccountTag(account), disabled: !account.active,
                  }))}
                  onChange={(value) => { setIds([value]); setError(""); }} />
              </div>
            ) : (
              <fieldset className="grid min-w-0 gap-2">
                <legend className="mb-2 text-sm font-medium">Contas no sorteio</legend>
                <div className="max-h-56 overflow-auto rounded-lg border border-border px-3">
                  {accounts.map((account) => <label key={account.id} className="flex min-h-11 min-w-0 items-center gap-3 border-b border-border py-2 last:border-0">
                    <Checkbox checked={ids.includes(account.id)} disabled={!account.active && !ids.includes(account.id)}
                      onChange={(event) => {
                        setIds((current) => event.target.checked ? [...current, account.id] : current.filter((accountId) => accountId !== account.id));
                        setError("");
                      }} />
                    <span className="min-w-0 flex-1 wrap-anywhere text-sm">{account.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{poolAccountTag(account)}</span>
                  </label>)}
                </div>
              </fieldset>
            )}
        </SkeletonReveal>
      )}
      {error && <p role="alert" className="text-pretty text-sm text-destructive">{error}</p>}
    </EditDialog>
  );
}

function poolAccountTag(account: PoolAccountChoice) {
  return account.active ? `Final ${account.walletId.slice(-8)}` : "Pausada";
}
