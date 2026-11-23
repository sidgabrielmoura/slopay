"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { PasskeyActions, usePasskeyConfirmation } from "@/features/auth/components/passkey-confirmation";
import type { PasskeyOptions } from "@/features/auth/passkey-contract";
import { ApiError } from "@/lib/api-client";
import type { IntegrationProof } from "../integration-proof";

export function IntegrationConfirmationDialog<Result>({ scope, title, description, completed, children, options, apply, onSuccess, onClose, restoreFocus, resultContent, preventOutsideClose }: {
  scope: string;
  title: string;
  description: string;
  completed: string;
  children: ReactNode;
  options: () => Promise<PasskeyOptions>;
  apply: (proof: IntegrationProof) => Promise<Result>;
  onSuccess: (result: Result) => void;
  onClose: () => void;
  restoreFocus?: () => void;
  resultContent?: ReactNode;
  preventOutsideClose?: boolean;
}) {
  const fieldId = useId();
  const [finished, setFinished] = useState(false);
  const [open, setOpen] = useState(true);
  const closing = useRef(false);

  function complete(result: Result) {
    setFinished(true);
    onSuccess(result);
  }

  const code = useCodeVerification({
    verify: (verificationCode) => apply({ verificationCode }),
    onSuccess: complete,
    isRejection: (error) => error instanceof ApiError && error.code === "INTEGRATION_CODE_REJECTED",
    failureMessage: "Não foi possível confirmar a operação.",
  });
  const passkey = usePasskeyConfirmation({
    scope: finished || !open ? null : scope, loadOptions: options, verify: (credential) => apply({ credential }), onSuccess: complete,
  });
  const busy = !finished && (passkey.busy || code.busy);

  function close() {
    if (busy || closing.current) return;
    closing.current = true;
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(event) => { if (busy || preventOutsideClose) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus?.(); onClose(); }}>
        <DialogHeader className="text-left">
          <DialogTitle>{finished ? completed : title}</DialogTitle>
          <DialogDescription>{finished ? "O Slopay registrou a operação." : description}</DialogDescription>
        </DialogHeader>
        {finished ? (
          <div className="grid min-w-0 justify-items-start gap-4">
            <LoadingConfirmation size={48} animate />
            {resultContent}
            <Button type="button" autoFocus onClick={close}>Concluir</Button>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            {children}
            {passkey.showPasskey ? <PasskeyActions prompt={passkey} autoFocus /> : (
              <>
                <CodeSlots {...code.field} id={fieldId} format="totp" label="Código do autenticador"
                  autoFocus successLabel="Identidade confirmada." />
                {passkey.available && <Button type="button" variant="outline" disabled={busy}
                  onClick={() => { code.reset(); passkey.choosePasskey(); }}>Usar biometria</Button>}
              </>
            )}
            <Button type="button" variant="ghost" className="justify-self-end" disabled={busy} onClick={close}>Cancelar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
