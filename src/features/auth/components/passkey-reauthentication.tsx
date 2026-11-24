"use client";

import type { FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { authApiService } from "@/services/auth-api.service";
import { withSessionLock } from "../session-refresh";
import { AuthPasswordField } from "./auth-password-field";
import { CodeSlots, useCodeVerification } from "./code-slots";

export function PasskeyReauthentication({ onSuccess }: { onSuccess: () => void }) {
  const factor = useCodeVerification({
    verify: ({ password, code }: { password: string; code: string }) =>
      withSessionLock(() => authApiService.reauthenticate(password, code)),
    onSuccess,
    isRejection: (failure) => failure instanceof ApiError && [400, 401].includes(failure.status),
    failureMessage: "Não foi possível confirmar a identidade.",
  });
  const codeId = "passkey-reauth-code";

  function checkCode(code: string, form: HTMLFormElement | null) {
    if (!form || factor.busy || !/^\d{6}$/.test(code) || !form.reportValidity()) return;
    const password = String(new FormData(form).get("password") ?? "");
    void factor.field.onComplete({ password, code });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    checkCode(String(new FormData(event.currentTarget).get(codeId) ?? ""), event.currentTarget);
  }

  return (
    <form method="post" onSubmit={submit} aria-busy={factor.busy} className="space-y-4">
      <AuthPasswordField id="passkey-reauth-password" name="password" label="Senha atual"
        autoComplete="current-password" required maxLength={128} readOnly={factor.busy} autoFocus
        onBlur={(event) => {
          const form = event.currentTarget.form;
          if (form && event.relatedTarget === form.elements.namedItem(codeId)) {
            checkCode(String(new FormData(form).get(codeId) ?? ""), form);
          }
        }} />
      <CodeSlots id={codeId} label="Código do autenticador" format="totp" {...factor.field}
        onComplete={checkCode} onRetry={checkCode} />
    </form>
  );
}
