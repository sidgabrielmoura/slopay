"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CirclePause, CirclePlay, Ellipsis, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/shared/table-pagination";
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
import { cn } from "@/lib/utils";
import {
  issuedKeySchema, keyDraftSchema, sandboxKeyPermissions, sandboxKeySchema,
  type IssuedKey, type KeyChange, type KeyDraft, type KeyProof, type SandboxKey,
} from "../sandbox-keys";
import { apiKeysPath } from "../navigation";
import { ApiKeyIssuedContent } from "./api-key-issued-content";
import { ApiKeyQuickStart } from "./api-key-quick-start";
import { IntegrationHeading } from "./integration-heading";

const endpoint = "/api/integrations/keys";
const unavailable = "As chaves de API estão temporariamente indisponíveis.";

const actionTitles = { pause: "Pausar chave", resume: "Reativar chave", revoke: "Revogar chave" } as const;
const actionResults = { pause: "Chave pausada", resume: "Chave reativada", revoke: "Chave revogada" } as const;
const statusLabels = { active: "Ativa", paused: "Pausada", expired: "Expirada", revoked: "Revogada" } as const;
const statusVariants = { active: "success", paused: "warning", expired: "secondary", revoked: "secondary" } as const;
const keyColumns = "@3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_7rem_5.5rem_2.75rem]";

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

export function SandboxIntegrationKeysScreen({
  keys, pagination, companyName, development, apiOrigin, canManage = true,
}: {
  keys: SandboxKey[];
  pagination: { page: number; pageSize: number; total: number };
  companyName: string;
  development: boolean;
  apiOrigin: string | null;
  canManage?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listPending, startListTransition] = useTransition();
  const apiPath = development ? "/v1/sandbox/pix" : "/v1/pix";
  const [modal, setModal] = useState<Modal | null>(null);
  const button = useRef<HTMLElement | null>(null);
  const listTitle = useRef<HTMLHeadingElement>(null);
  const formName = useRef<HTMLInputElement>(null);
  const confirmation = modal?.kind === "confirm" ? modal.operation : null;

  function changePage(page: number) {
    const query = new URLSearchParams(searchParams.toString());
    if (page === 1) query.delete("pagina");
    else query.set("pagina", String(page));
    const search = query.toString();
    startListTransition(() => router.replace(search ? `${apiKeysPath}?${search}` : apiKeysPath, { scroll: false }));
  }

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
      setModal(result);
      return;
    }
    if (result.key.status === "revoked") button.current = null;
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
    // Refresh after dismissal so a failed reload can't interrupt access to the issued secret.
    if (modal?.kind === "issued" && pagination.page !== 1) changePage(1);
    else if (modal?.kind === "issued" || modal?.kind === "done" || code.field.status.status === "failed" || passkey.error) {
      startListTransition(() => router.refresh());
    }
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

  const title = modal?.kind === "done" ? actionResults[modal.action]
    : confirmation?.kind === "change" ? actionTitles[confirmation.action]
      : confirmation ? "Confirmar criação da chave" : "Nova chave de API";

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6">
      <IntegrationHeading
        title="Chaves de API"
        description={development ? "Gerencie o acesso das aplicações ao Sandbox da sua empresa." : "Gerencie o acesso das aplicações à sua conta Slopay."}
        action={canManage && <Button className="h-11 w-full sm:w-auto" onClick={(event) => {
          button.current = event.currentTarget;
          setModal({ kind: "form" });
        }}><Plus aria-hidden="true" data-icon="inline-start" /> Nova chave</Button>}
      />

      <Card className="@container min-w-0" aria-labelledby="api-keys-list-title" aria-busy={listPending}>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <KeyRound aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 id="api-keys-list-title" ref={listTitle} tabIndex={-1} className="text-lg font-semibold tracking-tight">Chaves cadastradas</h2>
              <p className="wrap-anywhere text-sm text-muted-foreground">{companyName}</p>
            </div>
          </div>
          {development && <Badge variant="secondary" className="shrink-0">Sandbox</Badge>}
        </CardHeader>
        {keys.length === 0 ? (
          <Empty icon={<KeyRound aria-hidden="true" />} className="rounded-none border-0" title="Nenhuma chave cadastrada"
            description={canManage ? "Crie uma chave para conectar uma aplicação à API." : undefined} />
        ) : (
          <>
            <div aria-hidden="true" className={cn("hidden gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-medium text-muted-foreground @3xl:grid", keyColumns)}>
              <span>Chave</span>
              <span>Permissões</span>
              <span>Vencimento</span>
              <span>Status</span>
            </div>
            <ul role="list" className="divide-y divide-border" aria-label="Chaves cadastradas">
              {keys.map((key) => (
                <li key={key.id} className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-3 gap-y-4 p-4 sm:p-6 @3xl:gap-x-4", keyColumns)}>
                  <div className="col-start-1 row-start-1 min-w-0">
                    <h3 className="wrap-anywhere text-sm font-semibold">{key.name}</h3>
                    <code className="mt-1.5 block wrap-anywhere font-mono text-xs text-muted-foreground">{key.keyPrefix}</code>
                    {key.lastUsedAt && <p className="mt-2 text-xs text-muted-foreground">
                      Último uso <time className="tabular-nums" dateTime={key.lastUsedAt}>{formatDateTime(key.lastUsedAt, "short")}</time>
                    </p>}
                  </div>
                  <div className="col-span-full row-start-2 min-w-0 border-t pt-3 @3xl:col-[2] @3xl:row-start-1 @3xl:border-0 @3xl:pt-0">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground @3xl:sr-only">Permissões</p>
                    {key.scopes.length ? (
                      <ul className="grid gap-1.5 pl-4 text-sm marker:text-muted-foreground">
                        {key.scopes.map((scope) => <li key={scope} className="list-disc wrap-anywhere leading-snug">{sandboxKeyPermissions[scope]}</li>)}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground">Sem permissões</p>}
                  </div>
                  <dl className="col-span-full row-start-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 @3xl:col-[3] @3xl:row-start-1">
                    <dt className="text-xs font-medium text-muted-foreground @3xl:sr-only">Vencimento</dt>
                    <dd className="text-sm tabular-nums">
                      {key.expiresAt ? <time dateTime={key.expiresAt}>{formatDateTime(key.expiresAt, "date-only")}</time> : "Sem vencimento"}
                    </dd>
                  </dl>
                  <dl className="col-start-2 row-start-1 self-start @3xl:col-start-4">
                    <dt className="sr-only">Status</dt>
                    <dd><Badge variant={statusVariants[key.status]}>{statusLabels[key.status]}</Badge></dd>
                  </dl>
                  {canManage && <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost"
                        className="col-start-3 row-start-1 -mt-2 size-11 text-muted-foreground @3xl:col-start-5"
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
                  </DropdownMenu>}
                </li>
              ))}
            </ul>
            <TablePagination {...pagination} busy={listPending} label="Paginação das chaves de API" onPageChange={(page) => {
              listTitle.current?.focus();
              changePage(page);
            }} />
          </>
        )}
      </Card>

      {apiOrigin && <ApiKeyQuickStart apiOrigin={apiOrigin} apiPath={apiPath} />}

      <Dialog open={canManage && modal !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto p-4 sm:max-w-lg sm:p-6"
          onInteractOutside={(event) => { if (busy || modal?.kind === "issued") event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (button.current?.isConnected ? button.current : listTitle.current)?.focus();
          }}>
          {modal?.kind !== "issued" && (
            <div className="flex min-w-0 items-center gap-3 pr-6">
              {modal?.kind === "done" && <LoadingConfirmation size={40} animate />}
              <DialogHeader className="min-w-0 text-left">
                <DialogTitle className="text-balance text-xl leading-snug">{title}</DialogTitle>
                <DialogDescription className="wrap-anywhere text-pretty">
                  {modal?.kind === "done" ? "O novo status já vale para as próximas requisições."
                    : confirmation?.kind === "change" ? `Confirme a alteração de acesso da chave ${confirmation.key.name}.`
                      : confirmation ? "Confira as permissões antes de confirmar sua identidade."
                        : "Defina quais operações a aplicação poderá realizar."}
                </DialogDescription>
              </DialogHeader>
            </div>
          )}

          {modal?.kind === "form" && (
            <form className="grid min-w-0 gap-5" onSubmit={review}>
              <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="sandbox-key-name" className="text-sm font-medium">Nome da chave</label>
                  <Input ref={formName} id="sandbox-key-name" name="name" required autoComplete="off" maxLength={80}
                    placeholder="Ex. ERP da empresa" className="h-11" />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="sandbox-key-expiration" className="text-sm font-medium">Vencimento <span className="text-muted-foreground">(opcional)</span></label>
                  <Input id="sandbox-key-expiration" name="expiresOn" type="date" className="h-11 min-w-0 scheme-dark" />
                </div>
              </div>
              <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-medium">Permissões</legend>
                <div className="divide-y rounded-lg border bg-background">
                  {Object.entries(sandboxKeyPermissions).map(([scope, label]) => (
                    <label key={scope} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                      <Checkbox name="scopes" value={scope} defaultChecked={scope === "pix:charges:read"} /> {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <footer className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="ghost" className="h-11" onClick={close}>Cancelar</Button>
                <Button type="submit" className="h-11">Continuar</Button>
              </footer>
            </form>
          )}

          {confirmation && (
            <div className="grid gap-4">
              {confirmation.kind === "create" && (
                <dl className="grid min-w-0 gap-3 rounded-lg border bg-background p-4 text-sm">
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">Nome da chave</dt>
                    <dd className="wrap-anywhere font-medium">{confirmation.draft.name}</dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">Permissões</dt>
                    <dd>
                      <ul className="list-disc space-y-1 pl-4 text-sm marker:text-muted-foreground">
                        {confirmation.draft.scopes.map((scope) => <li key={scope}>{sandboxKeyPermissions[scope]}</li>)}
                      </ul>
                    </dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-xs text-muted-foreground">Vencimento</dt>
                    <dd className="tabular-nums">{confirmation.draft.expiresAt
                      ? <time dateTime={confirmation.draft.expiresAt}>{formatDateTime(confirmation.draft.expiresAt, "date-only")}</time>
                      : "Sem vencimento"}</dd>
                  </div>
                </dl>
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
              <footer className="flex justify-end border-t pt-4">
                <Button variant="ghost" className="h-11" disabled={busy} onClick={close}>Cancelar</Button>
              </footer>
            </div>
          )}

          {modal?.kind === "issued" && <ApiKeyIssuedContent name={modal.key.name} secret={modal.key.secret} onClose={close} />}

          {modal?.kind === "done" && <footer className="flex justify-end border-t pt-4">
            <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={close}
              ref={(control) => { control?.focus({ preventScroll: true }); }}>Concluir</Button>
          </footer>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

