"use client";

import Link from "next/link";
import { useState } from "react";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { authApiService } from "@/services/auth-api.service";
import { AuthActionLink } from "./auth-action-link";
import { AuthActionButton, AuthHeading, AuthSuccessMark } from "./auth-form-controls";
import { AuthFormMotion } from "./auth-motion";

export function VerifyEmailLink({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      await authApiService.verifyEmail(token);
      setVerified(true);
      window.history.replaceState(null, "", window.location.pathname);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível confirmar o e-mail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFormMotion step={verified ? 1 : 0} animateOnMount={false} className="space-y-5">
      {verified ? (
        <>
          <AuthSuccessMark />
          <AuthHeading>E-mail confirmado</AuthHeading>
          <ToastNotice variant="success" message="E-mail confirmado." />
          <AuthActionLink href="/conta-em-validacao" pendingLabel="Abrindo cadastro…">Continuar cadastro</AuthActionLink>
        </>
      ) : (
        <>
          <AuthHeading>Confirmar e-mail</AuthHeading>
          {error && <OperationFailure message={error} />}
          <AuthActionButton type="button" onClick={confirm} pending={busy} pendingLabel="Confirmando…" className="w-full">
            Confirmar e-mail pelo link
          </AuthActionButton>
          <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao login</Link>
        </>
      )}
    </AuthFormMotion>
  );
}
