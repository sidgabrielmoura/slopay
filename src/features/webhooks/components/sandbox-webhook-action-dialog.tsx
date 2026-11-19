"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { PasskeyActions, usePasskeyConfirmation } from "@/features/auth/components/passkey-confirmation";
import { ApiError } from "@/lib/api-client";
import { sandboxWebhookGateway, sandboxWebhooksKey } from "../sandbox-webhook-gateway";
import type { SandboxWebhookAction, SandboxWebhookActionResult } from "../sandbox-webhooks";
import { webhookEvents } from "../webhooks";

export type WebhookReview = { action: SandboxWebhookAction; name: string };

const titles: Record<SandboxWebhookAction["kind"], string> = {
  create: "Criar webhook", update: "Salvar alterações", pause: "Pausar webhook", enable: "Habilitar webhook",
  resume: "Reativar fila", delete: "Excluir webhook", "rotate-secret": "Trocar segredo de assinatura", retry: "Reenviar evento",
};
const completed: Record<SandboxWebhookAction["kind"], string> = {
  create: "Webhook cadastrado", update: "Webhook atualizado", pause: "Webhook pausado", enable: "Webhook habilitado",
  resume: "Fila reativada", delete: "Webhook excluído", "rotate-secret": "Segredo atualizado", retry: "Entrega encaminhada",
};

export function SandboxWebhookActionDialog({ accountId, review, onClose, onComplete, restoreFocus }: {
  accountId: string;
  review: WebhookReview;
  onClose: () => void;
  onComplete?: (result: SandboxWebhookActionResult) => void;
  restoreFocus?: () => void;
}) {
  const query = useQueryClient();
  const [result, setResult] = useState<SandboxWebhookActionResult | null>(null);
  const [open, setOpen] = useState(true);
  const closing = useRef(false);
  const action = review.action;
  const settings = "settings" in action ? action.settings : undefined;

  function applied(next: SandboxWebhookActionResult) {
    setResult(next);
    void query.invalidateQueries({ queryKey: sandboxWebhooksKey(accountId) });
  }

  const code = useCodeVerification({
    verify: (verificationCode) => sandboxWebhookGateway.apply(action, { verificationCode }),
    onSuccess: applied,
    isRejection: (error) => error instanceof ApiError && error.code === "INTEGRATION_CODE_REJECTED",
    failureMessage: "Não foi possível concluir a operação.",
  });
  const passkey = usePasskeyConfirmation({
    scope: result ? null : JSON.stringify(action),
    loadOptions: () => sandboxWebhookGateway.options(action),
    verify: (credential) => sandboxWebhookGateway.apply(action, { credential }),
    onSuccess: applied,
  });
  const busy = !result && (passkey.busy || code.busy);

  function close() {
    if (busy || closing.current) return;
    closing.current = true;
    setOpen(false);
  }

  function finishClose(event: Event) {
    event.preventDefault();
    if (result) onComplete?.(result);
    if (!result || !onComplete) restoreFocus?.();
    onClose();
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Segredo de assinatura copiado.");
    } catch {
      toast.error("Selecione o segredo para copiá-lo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={finishClose}
        onInteractOutside={(event) => { if (busy || result?.signingSecret) event.preventDefault(); }}>
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>{result ? completed[action.kind] : titles[action.kind]}</DialogTitle>
          <DialogDescription>
            {result?.signingSecret
              ? "Copie o segredo de assinatura e guarde-o no servidor que recebe os eventos."
              : result ? review.name
                : action.kind === "resume" ? "A fila vai tentar entregar primeiro o evento que a interrompeu."
                  : action.kind === "rotate-secret" ? "As entregas ficam pausadas enquanto você configura o novo segredo no destino."
                    : "Confira a operação e confirme sua identidade."}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid min-w-0 gap-3">
            <LoadingConfirmation size={40} animate />
            {result.signingSecret && (
              <>
                <p className="text-sm text-muted-foreground">O segredo é exibido uma única vez.</p>
                <code className="select-all wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs">{result.signingSecret}</code>
              </>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {result.signingSecret && <Button type="button" variant="outline" className="h-11" autoFocus
                onClick={() => void copySecret(result.signingSecret!)}><Copy aria-hidden="true" data-icon="inline-start" /> Copiar segredo</Button>}
              <Button type="button" className="h-11" autoFocus={!result.signingSecret} onClick={close}>Concluir</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-1 rounded-lg border p-3 text-sm">
              <strong className="wrap-anywhere">{review.name}</strong>
              {settings && <>
                <span className="wrap-anywhere text-muted-foreground">{settings.endpointUrl}</span>
                <span className="text-pretty text-muted-foreground">{settings.eventTypes.map((event) => webhookEvents[event].label).join(" · ")}</span>
                <span className="text-muted-foreground">{settings.deliveryMode === "SEQUENTIAL" ? "Sequencial" : "Não sequencial"} · {settings.retryEnabled ? "Com retentativas" : "Uma tentativa"}</span>
              </>}
            </div>
            {passkey.showPasskey ? <PasskeyActions prompt={passkey} autoFocus /> : (
              <>
                <CodeSlots {...code.field} id="webhook-action-code" format="totp" label="Código do autenticador"
                  autoFocus successLabel="Identidade confirmada." />
                {passkey.available && <Button type="button" variant="outline" disabled={busy}
                  onClick={() => { code.reset(); passkey.choosePasskey(); }}>Usar biometria</Button>}
              </>
            )}
            <Button type="button" variant="ghost" className="h-11 justify-self-end" disabled={busy} onClick={close}>Cancelar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

