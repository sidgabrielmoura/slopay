"use client";

import { useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { authApiService } from "@/services/auth-api.service";
import { withSessionLock } from "../session-refresh";
import { AuthField } from "./auth-form-controls";
import { CodeSlots, useCodeVerification } from "./code-slots";
import { PasskeyActions, usePasskeyConfirmation } from "./passkey-confirmation";

export function PasskeyReauthentication({ onSuccess }: { onSuccess: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const passkey = usePasskeyConfirmation({
    scope: "passkey-enrollment-reauth",
    loadOptions: authApiService.passkeyReauthenticationOptions,
    verify: (credential) => {
      const form = formRef.current;
      if (!form) return Promise.reject(new ApiError("Reabra a confirmação para continuar.", 400));
      const password = String(new FormData(form).get("password") ?? "");
      return withSessionLock(() => authApiService.reauthenticate(password, { credential }));
    },
    onSuccess,
  });
  const factor = useCodeVerification({
    verify: ({ password, code }: { password: string; code: string }) =>
      withSessionLock(() => authApiService.reauthenticate(password, { twoFactorCode: code })),
    onSuccess,
    isRejection: (failure) => failure instanceof ApiError && [400, 401].includes(failure.status),
    failureMessage: "Não foi possível confirmar a identidade.",
  });
  const busy = passkey.busy || factor.busy;
  const codeId = "passkey-reauth-code";

  function checkCode(form: HTMLFormElement | null, code: string) {
    if (!form || busy || !/^\d{6}$/.test(code) || !form.reportValidity()) return;
    const password = String(new FormData(form).get("password") ?? "");
    void factor.field.onComplete({ password, code });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || passkey.checking) return;
    if (passkey.showPasskey) {
      void passkey.confirm();
      return;
    }
    checkCode(event.currentTarget, String(new FormData(event.currentTarget).get(codeId) ?? ""));
  }

  return (
    <form ref={formRef} method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
      <AuthField id="passkey-reauth-password" name="password" label="Senha atual" type="password"
        autoComplete="current-password" required maxLength={128} readOnly={busy} autoFocus
        onBlur={(event) => {
          const form = event.currentTarget.form;
          if (form && event.relatedTarget === form.elements.namedItem(codeId)) {
            checkCode(form, String(new FormData(form).get(codeId) ?? ""));
          }
        }} />
      {passkey.showPasskey ? (
        <PasskeyActions prompt={passkey} onConfirm={(method) => {
          if (formRef.current?.reportValidity()) void passkey.confirm(method);
        }} />
      ) : (
        <>
          <CodeSlots id={codeId} label="Código do autenticador" format="totp" {...factor.field}
            onComplete={(code, form) => checkCode(form, code)}
            onRetry={(code, form) => checkCode(form, code)} />
          {passkey.available && <Button type="button" variant="link" className="h-11 px-0" disabled={busy}
            onClick={() => { factor.reset(); passkey.choosePasskey(); }}>Usar chave de acesso</Button>}
        </>
      )}
    </form>
  );
}
