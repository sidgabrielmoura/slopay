"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { AuthError, AuthField, LogoutButton } from "./live-auth-forms";
import { authApiService } from "@/services/auth-api.service";

export function LiveMfa({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState<{ secret: string; qrCodeUri: string }>();
  const [codes, setCodes] = useState<string[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      if (pending) {
        const result = await authApiService.verify2FA(String(data.get("new-code") ?? ""));
        setPending(undefined);
        setCodes(result.backupCodes);
      } else {
        const result = await authApiService.setup2FA(
          String(data.get("password") ?? ""),
          enabled ? String(data.get("current-code") ?? "") : undefined,
        );
        form.reset();
        setPending(result);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível configurar o 2FA.");
    } finally {
      setBusy(false);
    }
  }

  if (codes) {
    return (
      <section className="space-y-5" aria-labelledby="backup-heading">
        <h1 id="backup-heading" className="text-2xl font-semibold tracking-tight">Códigos de recuperação</h1>
        <p className="text-sm text-muted-foreground">
          Guarde os códigos em local seguro. Cada código pode ser usado uma vez.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-4 font-mono text-sm">
          {codes.map((code, index) => <li key={index}>{code}</li>)}
        </ul>
        <Button asChild><Link href="/entrar">Entrar com o 2FA ativo</Link></Button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {enabled ? "Trocar autenticador" : "Ativar autenticação em dois fatores"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {pending ? "Escaneie o QR Code ou digite a chave no aplicativo autenticador." : "Confirme sua identidade para configurar o autenticador."}
        </p>
      </header>
      {pending && (
        <div className="space-y-3">
          <div className="w-fit rounded-md bg-white p-2">
            <QRCodeSVG value={pending.qrCodeUri} title="QR Code de configuração do autenticador" size={152} marginSize={4} />
          </div>
          <p className="text-sm">Chave manual <code className="block break-all text-primary">{pending.secret}</code></p>
        </div>
      )}
      <form key={String(Boolean(pending))} method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
        {pending ? (
          <AuthField id="new-code" label="Código do novo autenticador" autoComplete="one-time-code"
            inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} autoFocus />
        ) : (
          <>
            <AuthField id="password" label="Senha atual" type="password" autoComplete="current-password" required maxLength={128} />
            {enabled && (
              <AuthField id="current-code" label="Código do autenticador atual" autoComplete="one-time-code"
                inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} />
            )}
          </>
        )}
        <AuthError message={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Validando…" : pending ? "Confirmar autenticador" : "Preparar autenticador"}
        </Button>
      </form>
      <LogoutButton />
    </section>
  );
}
