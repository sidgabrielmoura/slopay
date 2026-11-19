"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { formatCNPJ } from "@/lib/validators";
import {
  accountOpenings, openingLinkDraftSchema, openingReviewSchema,
  type OpeningDetail, type OpeningLinkDraft, type OpeningLinked, type OpeningReview,
} from "../account-openings";

const reviewCopy = {
  START_REVIEW: { title: "Assumir análise", description: "Seu nome ficará registrado como responsável pelo cadastro.", submit: "Assumir análise", complete: "Análise atribuída" },
  REQUEST_CHANGES: { title: "Solicitar ajustes", description: "A orientação ficará disponível para o titular no painel.", submit: "Solicitar ajustes", complete: "Ajustes solicitados" },
  REJECT: { title: "Recusar cadastro", description: "O motivo ficará disponível para o titular. A equipe poderá reabrir a análise.", submit: "Confirmar recusa", complete: "Recusa registrada" },
  REOPEN: { title: "Reabrir análise", description: "O cadastro voltará à fila e ficará sob sua responsabilidade.", submit: "Reabrir análise", complete: "Análise reaberta" },
};

type DialogHandoff = { onClose: () => void; restoreFocus: () => void; onChange: () => void };
const compactDialog = "max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-lg";

export function OpeningReviewDialog({ application, action, onClose, restoreFocus, onChange }: DialogHandoff & {
  application: OpeningDetail["application"];
  action: OpeningReview["action"];
}) {
  const copy = reviewCopy[action];
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const version = useRef(application.version);
  const needsReason = action !== "START_REVIEW";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || outcome === "success") return;
    const data = new FormData(event.currentTarget);
    const input = openingReviewSchema.safeParse({ action, version: version.current, reason: needsReason ? data.get("reason") : undefined });
    if (!input.success) {
      toast.error("Informe o motivo da decisão em até 600 caracteres.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setOutcome(null);
    try {
      await accountOpenings.review(application.id, input.data);
      setOutcome("success");
      onChange();
    } catch (failure) {
      const message = failure instanceof ApiError ? failure.message : "Não foi possível registrar a decisão.";
      if (failure instanceof ApiError && failure.status === 409) onChange();
      setError(message);
      setOutcome("failure");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) setOpen(false); }}>
      <DialogContent className={compactDialog} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onClose(); restoreFocus(); }}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance">{outcome === "success" ? copy.complete : copy.title}</DialogTitle>
          <DialogDescription className="text-pretty">{outcome === "success" ? application.ownerName : copy.description}</DialogDescription>
        </DialogHeader>
        {outcome === "success" ? (
          <div className="grid justify-items-start gap-4">
            <LoadingConfirmation size={48} animate />
            <Button type="button" className="h-11" autoFocus onClick={() => setOpen(false)}>Concluir</Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={submit} aria-busy={busy}>
            {needsReason && (
              <Field id="opening-review-reason" label={action === "REQUEST_CHANGES" ? "Orientação para o titular" : "Motivo"}>
                <Textarea id="opening-review-reason" name="reason" required maxLength={600} readOnly={busy} />
              </Field>
            )}
            {outcome === "failure" && <OperationFailure message={error} />}
            <DialogFooter>
              <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant={action === "REJECT" ? "destructive" : "default"} className="h-11" disabled={busy}>
                {busy && <LoadingIndicator />}{busy ? "Registrando…" : copy.submit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OpeningLinkDialog({ application, onClose, restoreFocus, onChange }: DialogHandoff & {
  application: OpeningDetail["application"];
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<OpeningLinkDraft>();
  const [result, setResult] = useState<OpeningLinked>();
  const [failure, setFailure] = useState("");
  const version = useRef(application.version);
  const prepared = useRef<OpeningLinkDraft>(null);
  const personal = application.accountType === "PF";

  function reviewDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = openingLinkDraftSchema.safeParse({
      version: version.current,
      legalName: fields.get("legalName"),
      cnpj: personal ? null : String(fields.get("cnpj") ?? "").replace(/[./-]/g, "").toUpperCase(),
      walletId: String(fields.get("walletId") ?? "").trim(),
      testCustomerId: String(fields.get("testCustomerId") ?? "").trim(),
      asaasApiKey: String(fields.get("asaasApiKey") ?? "").trim(),
    });
    if (!value.success) {
      const field = value.error.issues[0].path[0];
      const messages = {
        legalName: "Informe a razão social.",
        cnpj: "Confira o CNPJ da empresa.",
        walletId: "Informe um ID de carteira válido.",
        testCustomerId: "Informe o ID do pagador de teste iniciado por cus_.",
        asaasApiKey: "Informe uma chave de API do Asaas Sandbox.",
      };
      toast.error(messages[field as keyof typeof messages] ?? "Confira os dados da empresa.");
      const invalid = form.elements.namedItem(String(field));
      if (invalid instanceof HTMLElement) invalid.focus();
      return;
    }
    prepared.current = value.data;
    setOpen(false);
  }

  function finish() {
    setDraft(undefined);
    setResult(undefined);
    onChange();
    onClose();
  }

  if (draft) {
    return (
      <IntegrationConfirmationDialog scope={`account-opening:${application.id}:${draft.version}`}
        title="Confirmar vinculação" description={`Confira a conta Sandbox selecionada para ${application.ownerName}.`}
        completed="Conta vinculada" options={() => accountOpenings.options(application.id, draft)}
        apply={async (proof) => {
          setFailure("");
          try {
            return await accountOpenings.link(application.id, draft, proof);
          } catch (error) {
            if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")
                && [400, 409].includes(error.status)) {
              setFailure(error.message);
            }
            throw error;
          }
        }}
        onSuccess={(linked) => {
          setResult(linked);
          setDraft({ ...draft, asaasApiKey: "" });
          onChange();
        }}
        onClose={finish} restoreFocus={restoreFocus} resultContent={result && <WebhookCredentials result={result} />}>
        <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <div><dt className="text-xs text-muted-foreground">{personal ? "Titular" : "Empresa"}</dt><dd className="wrap-anywhere font-medium">{draft.legalName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{personal ? "CPF" : "CNPJ"}</dt>
            <dd className="tabular-nums">{draft.cnpj ? formatCNPJ(draft.cnpj) : `•••.•••.•••-${application.cpfSuffix}`}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Carteira Asaas</dt><dd className="wrap-anywhere font-mono text-xs">{draft.walletId}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Pagador de teste</dt><dd className="wrap-anywhere font-mono text-xs">{draft.testCustomerId}</dd></div>
        </dl>
        {failure && <OperationFailure message={failure} />}
      </IntegrationConfirmationDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={compactDialog} onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (prepared.current) {
          setDraft(prepared.current);
          prepared.current = null;
        } else {
          onClose();
          restoreFocus();
        }
      }}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance">Vincular conta Sandbox</DialogTitle>
          <DialogDescription className="text-pretty">Use os dados da conta já criada no Asaas para esta solicitação.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={reviewDraft} autoComplete="off">
          <Field id="opening-legal-name" label={personal ? "Nome do titular" : "Razão social"}>
            <Input id="opening-legal-name" name="legalName" className="h-11" required maxLength={150}
              defaultValue={application.legalName ?? ""} readOnly={Boolean(application.legalName)} />
          </Field>
          {!personal && <Field id="opening-cnpj" label="CNPJ">
            <BrazilianInput id="opening-cnpj" name="cnpj" mask="CNPJ" className="h-11"
              required defaultValue={application.cnpj ?? ""} readOnly={Boolean(application.cnpj)} />
          </Field>}
          <Field id="opening-wallet" label="ID da carteira">
            <Input id="opening-wallet" name="walletId" className="h-11" required maxLength={36} spellCheck={false} />
          </Field>
          <Field id="opening-test-customer" label="ID do pagador de teste">
            <Input id="opening-test-customer" name="testCustomerId" className="h-11" required maxLength={64} spellCheck={false} placeholder="cus_…" />
          </Field>
          <Field id="opening-asaas-key" label="Chave de API Sandbox">
            <Input id="opening-asaas-key" name="asaasApiKey" className="h-11" type="password"
              required maxLength={511} autoComplete="new-password" spellCheck={false} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="h-11">Revisar dados</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="grid min-w-0 gap-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children}</div>;
}

function WebhookCredentials({ result }: { result: OpeningLinked }) {
  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Selecione o campo e copie manualmente.");
    }
  }
  return (
    <section className="grid w-full min-w-0 gap-3" aria-label="Configuração do webhook">
      <p className="text-pretty text-sm text-muted-foreground">Configure o webhook no Asaas usando a URL pública do backend e o caminho abaixo. Copie o token antes de fechar.</p>
      <Field id="opening-webhook-path" label="Caminho do webhook">
        <div className="flex min-w-0 gap-2">
          <Input id="opening-webhook-path" readOnly value={result.webhookPath} className="h-11 min-w-0 font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Copiar caminho"
            onClick={() => void copy(result.webhookPath, "Caminho copiado.")}><Copy aria-hidden="true" /></Button>
        </div>
      </Field>
      <Field id="opening-webhook-token" label="Token do webhook">
        <div className="flex min-w-0 gap-2">
          <Input id="opening-webhook-token" readOnly value={result.webhookToken} className="h-11 min-w-0 font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Copiar token"
            onClick={() => void copy(result.webhookToken, "Token copiado.")}><Copy aria-hidden="true" /></Button>
        </div>
      </Field>
    </section>
  );
}
