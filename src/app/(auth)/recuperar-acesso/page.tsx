"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ToastNotice } from "@/components/ui/toast-notice";
import { AuthActionButton, AuthField, AuthHeading } from "@/features/auth/components/auth-form-controls";
import { AuthShell, recoverySteps } from "@/features/auth/components/auth-shell";
import { authApiService } from "@/services/auth-api.service";

export default function RecuperarAcessoPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const email = new FormData(event.currentTarget).get("email");
    if (typeof email !== "string") return;
    setBusy(true);
    setError(null);
    try {
      await authApiService.forgotPassword(email);
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível solicitar a recuperação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell step={sent ? 1 : 0} progress={{ steps: recoverySteps, current: 0 }}>
      <section className="space-y-5">
        <AuthHeading>Recuperar acesso</AuthHeading>
        {sent ? (
          <ToastNotice variant="success" message="Se o e-mail estiver confirmado na conta, você receberá instruções para redefinir sua senha." />
        ) : (
          <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
            <AuthField id="email" label="E-mail" type="email" autoComplete="email" maxLength={254} required />
            <ToastNotice message={error} persistent />
            <AuthActionButton pending={busy} pendingLabel="Solicitando…" className="w-full">
              Solicitar recuperação
            </AuthActionButton>
          </form>
        )}
        <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao login</Link>
      </section>
    </AuthShell>
  );
}
