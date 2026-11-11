"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthError, AuthField } from "@/features/auth/components/live-auth-forms";
import { authApiService } from "@/services/auth-api.service";

function VerifyEmailContent() {
  const urlToken = useSearchParams().get("token");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const token = (urlToken || String(data.get("token") ?? "")).trim();
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

  if (verified) {
    return (
      <section className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight" role="status">E-mail confirmado</h1>
        <Button asChild><Link href="/conta-em-validacao">Continuar cadastro</Link></Button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Confirmar e-mail</h1>
      <form method="post" onSubmit={confirm} aria-busy={busy} className="space-y-4">
        {!urlToken && <AuthField id="token" label="Código do e-mail" maxLength={512} required />}
        <AuthError message={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Confirmando…" : "Confirmar e-mail"}
        </Button>
      </form>
      <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao login</Link>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={<p role="status">Carregando confirmação…</p>}>
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  );
}
