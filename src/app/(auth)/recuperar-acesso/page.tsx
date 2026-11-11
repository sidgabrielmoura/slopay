"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthError, AuthField } from "@/features/auth/components/live-auth-forms";
import { authApiService } from "@/services/auth-api.service";

export default function RecuperarAcessoPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <AuthShell>
      <section className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar acesso</h1>
        {sent ? (
          <p role="status" className="text-sm text-muted-foreground">
            Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.
          </p>
        ) : (
          <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
            <AuthField id="email" label="E-mail" type="email" autoComplete="email" maxLength={254} required />
            <AuthError message={error} />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Solicitando…" : "Solicitar recuperação"}
            </Button>
          </form>
        )}
        <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao login</Link>
      </section>
    </AuthShell>
  );
}
