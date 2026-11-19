"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CirclePause, CirclePlay, Copy, Ellipsis, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { PasskeyActions, usePasskeyConfirmation } from "@/features/auth/components/passkey-confirmation";
import { passkeyOptionsSchema } from "@/features/auth/passkey-contract";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import {
  issuedKeySchema, keyDraftSchema, sandboxKeyPermissions, sandboxKeySchema,
  type IssuedKey, type KeyChange, type KeyDraft, type KeyProof, type SandboxKey,
} from "../sandbox-keys";
import { IntegrationHeading } from "./integration-heading";

const endpoint = "/api/integrations/keys";
const unavailable = "As chaves de API estão temporariamente indisponíveis.";

const actionTitles = { pause: "Pausar chave", resume: "Reativar chave", revoke: "Revogar chave" } as const;
const actionResults = { pause: "Chave pausada", resume: "Chave reativada", revoke: "Chave revogada" } as const;
const statusLabels = { active: "Ativa", paused: "Pausada", expired: "Expirada", revoked: "Revogada" } as const;

type Confirmation =
  | { kind: "create"; draft: KeyDraft }
  | { kind: "change"; key: SandboxKey; action: KeyChange };

type Modal =
  | { kind: "form" }
  | { kind: "confirm"; operation: Confirmation }
  | { kind: "issued"; key: IssuedKey }
  | { kind: "done"; action: KeyChange };

type Confirmed =
  | { kind: "issued"; key: IssuedKey }
  | { kind: "changed"; key: SandboxKey; action: KeyChange };

function post(body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function copySecret(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Chave de API copiada.");
  } catch {
    toast.error("Selecione a chave para copiá-la.");
  }
}

export function SandboxIntegrationKeysScreen({
  initialKeys, companyName,
}: {
  initialKeys: SandboxKey[];
  companyName: string;
}) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [modal, setModal] = useState<Modal | null>(null);
  const button = useRef<HTMLElement | null>(null);
  const listTitle = useRef<HTMLHeadingElement>(null);
  const formName = useRef<HTMLInputElement>(null);
  const confirmation = modal?.kind === "confirm" ? modal.operation : null;

  useEffect(() => { setKeys(initialKeys); }, [initialKeys]);

  async function mutate(proof: KeyProof): Promise<Confirmed> {
    if (confirmation?.kind === "create") {
      const key = await requestPixGateway(endpoint, issuedKeySchema, unavailable, post({ ...confirmation.draft, proof }));
      return { kind: "issued", key };
    }
    if (confirmation?.kind === "change") {
      const { key, action } = confirmation;
      const updated = await requestPixGateway(endpoint + "/" + key.id + "/status",
        sandboxKeySchema, unavailable, post({ action, proof }));
      return { kind: "changed", key: updated, action };
    }
    throw new Error("Revise a operação antes de confirmar.");
  }

  function apply(result: Confirmed) {
    if (result.kind === "issued") {
      const { secret: _secret, ...key } = result.key;
      setKeys((previous) => [key, ...previous]);
      setModal(result);
      return;
    }
    setKeys((previous) => result.key.status === "revoked"
      ? previous.filter((key) => key.id !== result.key.id)
      : previous.map((key) => key.id === result.key.id ? result.key : key));
    setModal({ kind: "done", action: result.action });
  }

  const code = useCodeVerification({
    verify: (verificationCode: string) => mutate({ verificationCode }),
    onSuccess: apply,
    isRejection: (error) => error instanceof ApiError && error.code === "INTEGRATION_CODE_REJECTED",
    failureMessage: unavailable,
  });
  const passkey = usePasskeyConfirmation({
    scope: confirmation ? (confirmation.kind === "create" ? JSON.stringify(confirmation.draft) : confirmation.key.id + confirmation.action) : null,
    loadOptions: () => confirmation?.kind === "create"
      ? requestPixGateway(endpoint + "/passkey-options", passkeyOptionsSchema, unavailable, post(confirmation.draft))
      : confirmation ? requestPixGateway(endpoint + "/" + confirmation.key.id + "/passkey-options",
        passkeyOptionsSchema, unavailable, post({ action: confirmation.action }))
        : Promise.resolve({ options: null }),
    verify: (credential) => mutate({ credential }),
    onSuccess: apply,
  });
  const busy = modal?.kind === "confirm" && (code.busy || passkey.busy);

  function close() {
    if (busy) return;
    if (code.field.status.status === "failed" || passkey.error) router.refresh();
    code.reset();
    setModal(null);
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const day = String(form.get("expiresOn") ?? "");
    const draft = keyDraftSchema.safeParse({
      name: form.get("name"),
      scopes: form.getAll("scopes"),
      expiresAt: day ? day + "T23:59:59-03:00" : undefined,
    });
    if (!draft.success) {
      if (!String(form.get("name") ?? "").trim()) formName.current?.focus();
      toast.error("Informe um nome e selecione as permissões da chave.");
      return;
    }
    if (draft.data.expiresAt && Date.parse(draft.data.expiresAt) <= Date.now()) {
      toast.error("Escolha uma data de vencimento futura.");
      return;
    }
    setModal({ kind: "confirm", operation: { kind: "create", draft: draft.data } });
  }

  const title = modal?.kind === "issued" ? "Chave de API criada"
    : modal?.kind === "done" ? actionResults[modal.action]
      : confirmation?.kind === "change" ? actionTitles[confirmation.action]
        : confirmation ? "Confirmar criação da chave" : "Nova chave de API";

  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading
        title="Chaves de API"
        description="Gerencie o acesso das aplicações ao Sandbox da sua empresa."
        action={<Button className="h-11 w-full sm:w-auto" onClick={(event) => {
          button.current = event.currentTarget;
          setModal({ kind: "form" });
        }}><Plus aria-hidden="true" data-icon="inline-start" /> Nova chave</Button>}
      />

      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b p-4 sm:p-5">
          <div className="grid min-w-0 gap-1">
            <h2 ref={listTitle} tabIndex={-1} className="text-lg font-semibold">Chaves cadastradas</h2>
            <p className="wrap-anywhere text-sm text-muted-foreground">{companyName}</p>
          </div>
          <Badge variant="secondary">Sandbox</Badge>
        </CardHeader>
        {keys.length === 0 ? (
          <Empty icon={<KeyRound aria-hidden="true" />} className="rounded-none border-0" title="Nenhuma chave cadastrada" />
        ) : (
          <ul className="divide-y divide-border" aria-label="Chaves cadastradas">
            {keys.map((key) => (
              <li key={key.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] xl:items-center">
                <div className="min-w-0">
                  <h3 className="wrap-anywhere text-sm font-semibold">{key.name}</h3>
                  <code className="mt-1 block wrap-anywhere text-xs text-muted-foreground">{key.keyPrefix}</code>
                  {key.lastUsedAt && <p className="mt-1 text-xs text-muted-foreground">
                    Último uso <time dateTime={key.lastUsedAt}>{formatDateTime(key.lastUsedAt, "short")}</time>
                  </p>}
                </div>
                <dl className="col-span-2 row-start-2 grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:col-span-1 xl:col-start-2 xl:row-start-1">
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Permissões</dt>
                    <dd className="mt-1 text-pretty">{key.scopes.map((scope) => sandboxKeyPermissions[scope]).join(" · ")}</dd>
                  </div>
                  <div><dt className="text-xs text-muted-foreground">Vencimento</dt>
                    <dd className="mt-1 tabular-nums">{key.expiresAt ? formatDateTime(key.expiresAt, "date-only") : "Sem data"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="mt-1"><Badge variant={key.status === "active" ? "success" : "secondary"}>{statusLabels[key.status]}</Badge></dd></div>
                </dl>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="col-start-2 row-start-1 size-11 xl:col-start-3"
                      aria-label={`Ações da chave ${key.name}`} onFocus={(event) => { button.current = event.currentTarget; }}>
                      <Ellipsis aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(event) => { if (modal) event.preventDefault(); }}>
                    {key.status === "active" || key.status === "paused" ? (
                      <>
                        <DropdownMenuItem className="min-h-10" onSelect={() => setModal({
                          kind: "confirm", operation: { kind: "change", key, action: key.status === "active" ? "pause" : "resume" },
                        })}>
                          {key.status === "active" ? <CirclePause aria-hidden="true" /> : <CirclePlay aria-hidden="true" />}
                          {key.status === "active" ? actionTitles.pause : actionTitles.resume}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    <DropdownMenuItem className="min-h-10 text-destructive" onSelect={() => setModal({
                      kind: "confirm", operation: { kind: "change", key, action: "revoke" },
                    })}>
                      <Trash2 aria-hidden="true" /> Revogar chave
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
          onInteractOutside={(event) => { if (busy || modal?.kind === "issued") event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (button.current?.isConnected ? button.current : listTitle.current)?.focus();
          }}>
          <DialogHeader className="pr-5 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {modal?.kind === "issued" ? "Copie a chave. O valor completo é exibido uma vez."
                : modal?.kind === "done" ? "O novo status já vale para as próximas requisições."
                  : confirmation?.kind === "change" ? `Confirme a alteração de acesso da chave ${confirmation.key.name}.`
                    : confirmation ? "Confira as permissões antes de confirmar sua identidade."
                      : "Defina quais operações a aplicação poderá realizar no Sandbox."}
            </DialogDescription>
          </DialogHeader>

          {modal?.kind === "form" && (
            <form className="flex flex-col gap-4" onSubmit={review}>
              <div className="grid gap-1.5">
                <label htmlFor="sandbox-key-name" className="text-sm font-medium">Nome da chave</label>
                <Input ref={formName} id="sandbox-key-name" name="name" required autoComplete="off" maxLength={80}
                  placeholder="Ex. ERP da empresa" className="h-11" />
              </div>
              <fieldset className="grid min-w-0 gap-2">
                <legend className="mb-2 text-sm font-medium">Permissões</legend>
                {Object.entries(sandboxKeyPermissions).map(([scope, label]) => (
                  <label key={scope} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                    <Checkbox name="scopes" value={scope} defaultChecked={scope === "pix:charges:read"} /> {label}
                  </label>
                ))}
              </fieldset>
              <div className="grid gap-1.5">
                <label htmlFor="sandbox-key-expiration" className="text-sm font-medium">Vencimento <span className="text-muted-foreground">(opcional)</span></label>
                <Input id="sandbox-key-expiration" name="expiresOn" type="date" className="h-11 min-w-0 scheme-dark" />
              </div>
              <Button type="submit" className="h-11 self-end">Continuar</Button>
            </form>
          )}

          {confirmation && (
            <div className="grid gap-4">
              {confirmation.kind === "create" && (
                <div className="grid gap-1 rounded-lg border p-3 text-sm">
                  <strong className="wrap-anywhere">{confirmation.draft.name}</strong>
                  <span className="text-muted-foreground">{confirmation.draft.scopes.map((scope) => sandboxKeyPermissions[scope]).join(" · ")}</span>
                  <span className="text-muted-foreground">{confirmation.draft.expiresAt
                    ? `Vence em ${formatDateTime(confirmation.draft.expiresAt, "date-only")}` : "Sem vencimento"}</span>
                </div>
              )}
              {passkey.showPasskey ? <PasskeyActions prompt={passkey} autoFocus /> : (
                <>
                  <CodeSlots {...code.field} id="sandbox-key-confirmation" format="totp" label="Código do autenticador"
                    autoFocus successLabel="Identidade confirmada." />
                  {passkey.available && <Button variant="outline" className="h-11" disabled={busy} onClick={() => {
                    code.reset();
                    passkey.choosePasskey();
                  }}>Usar biometria</Button>}
                </>
              )}
              <Button variant="ghost" className="h-11 justify-self-end" disabled={busy} onClick={close}>Cancelar</Button>
            </div>
          )}

          {modal?.kind === "issued" && (
            <div className="grid min-w-0 gap-3">
              <LoadingConfirmation size={40} animate />
              <p className="wrap-anywhere text-sm font-medium">{modal.key.name}</p>
              <code className="select-all wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs">{modal.key.secret}</code>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" className="h-11" onClick={() => void copySecret(modal.key.secret)}
                  ref={(control) => { control?.focus({ preventScroll: true }); }}>
                  <Copy aria-hidden="true" data-icon="inline-start" /> Copiar chave
                </Button>
                <Button className="h-11" onClick={close}>Concluir</Button>
              </div>
            </div>
          )}

          {modal?.kind === "done" && <div className="flex items-center justify-between gap-3">
            <LoadingConfirmation size={40} animate />
            <Button className="h-11" onClick={close} ref={(control) => { control?.focus({ preventScroll: true }); }}>Concluir</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

