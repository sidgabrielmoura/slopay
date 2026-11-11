"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { safeReturnTo } from "@/lib/auth-navigation";
import { cleanDocument, isValidCPF } from "@/lib/validators";
import { authApiService } from "@/services/auth-api.service";

export function AuthField({ label, id, ...props }: ComponentProps<typeof Input> & { label: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  return message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null;
}

function value(data: FormData, name: string) {
  const field = data.get(name);
  return typeof field === "string" ? field : "";
}

export function LiveLogin({ returnTo }: { returnTo?: string }) {
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);

    try {
      const result = needsCode
        ? await authApiService.completeLogin(value(data, "code"))
        : await authApiService.login(value(data, "email"), value(data, "password"));

      if ("requires2FA" in result) {
        form.reset();
        setNeedsCode(true);
        return;
      }

      window.location.replace(safeReturnTo(returnTo, result.user.role === "ADMIN" ? "/admin" : "/inicio"));
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "CHALLENGE_EXPIRED") setNeedsCode(false);
      setError(failure instanceof Error ? failure.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{needsCode ? "Verificar acesso" : "Entrar no SloPay"}</h1>
        {needsCode && (
          <p className="text-sm text-muted-foreground">Use seu aplicativo autenticador ou um código de recuperação.</p>
        )}
      </header>
      <form key={String(needsCode)} method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
        {needsCode ? (
          <AuthField id="code" label="Código de autenticação" autoComplete="one-time-code" autoFocus required maxLength={128} />
        ) : (
          <>
            <AuthField id="email" label="E-mail" type="email" autoComplete="username" maxLength={254} required />
            <AuthField id="password" label="Senha" type="password" autoComplete="current-password" maxLength={128} required />
          </>
        )}
        <AuthError message={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Validando…" : needsCode ? "Verificar e entrar" : "Entrar"}
        </Button>
      </form>
      {needsCode ? (
        <Button variant="link" className="px-0" disabled={busy} onClick={() => {
          setNeedsCode(false);
          setError(null);
        }}>
          Voltar ao login
        </Button>
      ) : (
        <nav aria-label="Opções de acesso" className="flex flex-wrap justify-between gap-3 text-sm text-primary">
          <Link href="/recuperar-acesso" className="underline-offset-4 hover:underline">Recuperar acesso</Link>
          <Link href="/criar-conta" className="underline-offset-4 hover:underline">Criar usuário</Link>
        </nav>
      )}
    </section>
  );
}

export function LiveRegistration() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const cpf = cleanDocument(value(data, "cpf"));
    if (!isValidCPF(cpf)) {
      setError("Confira o CPF informado.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await authApiService.register({
        fullName: value(data, "fullName").trim(),
        email: value(data, "email").trim().toLowerCase(),
        cpf,
        phone: cleanDocument(value(data, "phone")),
        password: value(data, "password"),
      });
      window.location.replace("/conta-em-validacao");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível criar o usuário.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Criar usuário</h1>
        <p className="text-sm text-muted-foreground">Use os dados da pessoa responsável pelo acesso.</p>
      </header>
      <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
        <AuthField id="fullName" label="Nome completo" autoComplete="name" required maxLength={100} />
        <AuthField id="email" label="E-mail" type="email" autoComplete="email" required maxLength={254} />
        <AuthField id="cpf" label="CPF" inputMode="numeric" required maxLength={14} />
        <AuthField id="phone" label="Telefone" type="tel" autoComplete="tel" required maxLength={20} />
        <AuthField id="password" label="Senha" type="password" autoComplete="new-password"
          required minLength={8} maxLength={128} aria-describedby="registration-password-help" />
        <p id="registration-password-help" className="text-xs text-muted-foreground">
          Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.
        </p>
        <AuthError message={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Criando usuário…" : "Criar usuário"}
        </Button>
      </form>
      <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao login</Link>
    </section>
  );
}

export function RenewSession({ returnTo }: { returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function renew() {
    setBusy(true);
    setError(null);
    try {
      await authApiService.refresh();
      window.location.replace(returnTo);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível renovar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5" aria-busy={busy}>
      <h1 className="text-2xl font-semibold tracking-tight">Continuar sessão</h1>
      <AuthError message={error} />
      <Button className="w-full" disabled={busy} onClick={renew}>{busy ? "Renovando…" : "Continuar"}</Button>
      <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Entrar novamente</Link>
    </section>
  );
}

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await authApiService.logout();
      window.location.replace("/entrar");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível encerrar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2" aria-busy={busy}>
      <Button variant="outline" disabled={busy} onClick={logout}>{busy ? "Encerrando…" : "Sair"}</Button>
      <AuthError message={error} />
    </div>
  );
}

export function ResendVerificationButton() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      await authApiService.resendVerification();
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível solicitar outro e-mail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2" aria-busy={busy}>
      {sent ? (
        <p role="status" className="text-sm text-muted-foreground">Novo e-mail solicitado. Confira sua caixa de entrada.</p>
      ) : (
        <Button variant="link" className="px-0" disabled={busy} onClick={resend}>
          {busy ? "Solicitando…" : "Solicitar outro e-mail"}
        </Button>
      )}
      <AuthError message={error} />
    </div>
  );
}
