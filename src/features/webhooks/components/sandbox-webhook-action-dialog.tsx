"use client";

import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { OperationFactorActions, usePasskeyConfirmation } from "@/features/auth/components/passkey-confirmation";
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
  const confirmationScope = useId();
  const [result, setResult] = useState<SandboxWebhookActionResult | null>(null);
  const [open, setOpen] = useState(true);
  const closing = useRef(false);
  const action = review.action;
  const settings = "settings" in action ? action.settings : undefined;
  const credentials = [];
  if (result?.signingSecret) credentials.push({ label: "Segredo de assinatura", value: result.signingSecret, copy: "Copiar segredo" });
  if (result?.authToken) credentials.push({ label: "Token de autenticação", value: result.authToken, copy: "Copiar token" });

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
    scope: result ? null : confirmationScope,
    loadOptions: () => sandboxWebhookGateway.options(action),
    verify: (credential) => sandboxWebhookGateway.apply(action, { credential }),
    verifySession: (sessionConfirmation) => sandboxWebhookGateway.apply(action, { sessionConfirmation }),
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

  async function copyCredential(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Credencial copiada.");
    } catch {
      toast.error("Selecione a credencial para copiá-la.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={finishClose}
        onInteractOutside={(event) => { if (busy || credentials.length > 0) event.preventDefault(); }}>
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>{result ? completed[action.kind] : titles[action.kind]}</DialogTitle>
          <DialogDescription>
            {credentials.length > 0
              ? "Guarde as credenciais no servidor que recebe os eventos. Elas são exibidas uma única vez."
              : result ? review.name
                : action.kind === "resume" ? "A fila vai tentar entregar primeiro o evento que a interrompeu."
                  : action.kind === "rotate-secret" ? "A fila é preservada. Configure o novo segredo, verifique o destino e habilite as entregas."
                    : "Confira a operação e confirme sua identidade."}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid min-w-0 gap-3">
            <LoadingConfirmation size={40} animate />
            {credentials.map(({ label, value, copy }, index) => (
              <div key={label} className="grid min-w-0 gap-2">
                <p className="text-sm font-medium">{label}</p>
                <code className="select-all wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs">{value}</code>
                <Button type="button" variant="outline" className="h-11 justify-self-start" autoFocus={index === 0}
                  onClick={() => void copyCredential(value)}><Copy aria-hidden="true" data-icon="inline-start" /> {copy}</Button>
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" className="h-11" autoFocus={credentials.length === 0} onClick={close}>Concluir</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-1 rounded-lg border p-3 text-sm">
              <strong className="wrap-anywhere">{review.name}</strong>
              {settings && <>
                <span className="wrap-anywhere text-muted-foreground">{settings.endpointUrl}</span>
                {settings.notificationEmail && <span className="wrap-anywhere text-muted-foreground">Avisos para {settings.notificationEmail}</span>}
                <span className="text-pretty text-muted-foreground">{settings.eventTypes.map((event) => webhookEvents[event].label).join(" · ")}</span>
                <span className="text-muted-foreground">{settings.deliveryMode === "SEQUENTIAL" ? "Sequencial" : "Não sequencial"} · {settings.retryEnabled ? "Com retentativas" : "Uma tentativa"}</span>
                {settings.queueEnabled !== undefined && <span className="text-muted-foreground">{settings.queueEnabled ? "Fila ativada" : "Fila pausada"}</span>}
              </>}
            </div>
            <OperationFactorActions prompt={passkey}>
              <CodeSlots {...code.field} id="webhook-action-code" format="totp" label="Código do autenticador"
                autoFocus successLabel="Identidade confirmada." />
              {passkey.available && <Button type="button" variant="outline" disabled={busy}
                onClick={() => { code.reset(); passkey.choosePasskey(); }}>Usar biometria</Button>}
            </OperationFactorActions>
            <Button type="button" variant="ghost" className="h-11 justify-self-end" disabled={busy} onClick={close}>Cancelar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

