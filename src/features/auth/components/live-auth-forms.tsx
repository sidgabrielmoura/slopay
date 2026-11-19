"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { onboardingDestination, safeReturnTo } from "@/lib/auth-navigation";
import { cleanDocument, isValidCPF } from "@/lib/validators";
import { authApiService } from "@/services/auth-api.service";
import { AUTH_PASSWORD_MAX_LENGTH, AUTH_PASSWORD_MIN_LENGTH, getAuthPasswordRequirements } from "../auth-password";
import { finishSignIn } from "../finish-sign-in";
import { rememberBrowserPasskey } from "../passkey-device";
import { AuthActionButton, AuthField, AuthHeading, PasswordRequirements } from "./auth-form-controls";
import { AuthShell, loginSteps } from "./auth-shell";
import { CodeSlots, useCodeVerification } from "./code-slots";
import { PasskeyActions, usePasskeyConfirmation } from "./passkey-confirmation";

function value(data: FormData, name: string) {
  const field = data.get(name);
  return typeof field === "string" ? field : "";
}

export function LiveLogin({ returnTo }: { returnTo?: string }) {
  const [needsFactor, setNeedsFactor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);

    try {
      const result = await authApiService.login(value(data, "email"), value(data, "password"));

      if ("requires2FA" in result) {
        form.reset();
        setNeedsFactor(true);
        return;
      }

      await finishLogin(result.user);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function finishLogin(user: Awaited<ReturnType<typeof authApiService.completeLogin>>["user"]) {
    const onboarding = onboardingDestination(user);
    const destination = onboarding ?? safeReturnTo(returnTo, user.role === "ADMIN" ? "/admin" : "/inicio");
    if (onboarding) window.location.replace(destination);
    else await finishSignIn(user.id, destination);
  }

  const step = needsFactor ? 1 : 0;

  return (
    <AuthShell step={step} progress={{ steps: loginSteps, current: step }}>
      <section className="space-y-6">
        <AuthHeading>{needsFactor ? "Verificar acesso" : "Entrar no SloPay"}</AuthHeading>
        {needsFactor ? (
          <LoginFactorStep
            onSuccess={finishLogin}
            onBack={(message) => {
              setNeedsFactor(false);
              setError(message ?? null);
            }}
          />
        ) : (
          <>
            <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
              <AuthField id="email" label="E-mail" type="email" autoComplete="username" maxLength={254} required />
              <AuthField id="password" label="Senha" type="password" autoComplete="current-password" maxLength={128} required />
              <ToastNotice message={error} persistent />
              <AuthActionButton pending={busy} pendingLabel="Validando…" className="w-full">Entrar</AuthActionButton>
            </form>
            <nav aria-label="Opções de acesso" className="flex flex-wrap justify-between gap-3 text-sm text-primary">
              <Link href="/recuperar-acesso" className="underline-offset-4 hover:underline">Recuperar acesso</Link>
              <Link href="/criar-conta" className="underline-offset-4 hover:underline">Criar usuário</Link>
            </nav>
          </>
        )}
      </section>
    </AuthShell>
  );
}

function LoginFactorStep({ onSuccess, onBack }: {
  onSuccess: (user: Awaited<ReturnType<typeof authApiService.completeLogin>>["user"]) => Promise<void>;
  onBack: (message?: string) => void;
}) {
  const [recovery, setRecovery] = useState(false);
  function returnIfExpired(failure: unknown) {
    if (failure instanceof ApiError && failure.code === "CHALLENGE_EXPIRED") onBack(failure.message);
  }

  const passkey = usePasskeyConfirmation({
    scope: "login",
    loadOptions: authApiService.passkeyLoginOptions,
    verify: authApiService.completeLoginWithPasskey,
    onSuccess: ({ user }) => {
      rememberBrowserPasskey(user.id);
      return onSuccess(user);
    },
    onError: returnIfExpired,
  });
  const verification = useCodeVerification({
    verify: async (code) => {
      try {
        return await authApiService.completeLogin(code);
      } catch (failure) {
        returnIfExpired(failure);
        throw failure;
      }
    },
    onSuccess: ({ user }) => onSuccess(user),
    isRejection: (failure) => failure instanceof ApiError && (failure.status === 400 || failure.status === 401),
    failureMessage: "Não foi possível verificar o código.",
  });
  return (
    <>
      {passkey.showPasskey ? (
        <PasskeyActions prompt={passkey} autoFocus />
      ) : (
        <>
          <p id="login-code-help" className="-mt-4 text-sm text-muted-foreground">
            {recovery ? "Digite ou cole um dos seus códigos de recuperação." : "Use os 6 dígitos do aplicativo autenticador."}
          </p>
          <CodeSlots
            key={String(recovery)}
            id="code"
            label={recovery ? "Código de recuperação" : "Código de autenticação"}
            format={recovery ? "recovery-code" : "totp"}
            describedBy="login-code-help"
            autoFocus
            {...verification.field}
          />
          <div className="flex flex-wrap gap-x-4">
            {passkey.available && (
              <Button type="button" variant="link" className="h-11 px-0" disabled={verification.busy} onClick={() => {
                verification.reset();
                passkey.choosePasskey();
              }}>Usar biometria</Button>
            )}
            <Button type="button" variant="link" className="h-11 px-0" disabled={verification.busy} onClick={() => {
              verification.reset();
              setRecovery(!recovery);
            }}>
              {recovery ? "Usar aplicativo autenticador" : "Usar código de recuperação"}
            </Button>
          </div>
        </>
      )}
      <Button type="button" variant="link" className="h-11 px-0" disabled={passkey.busy || verification.busy} onClick={() => onBack()}>
        Voltar ao login
      </Button>
    </>
  );
}

const CPF_ERROR = "Confira o CPF informado.";

export function LiveRegistration({ invitation }: { invitation?: string } = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const cpf = cleanDocument(value(data, "cpf"));
    const submittedPassword = value(data, "password");
    setError(null);
    if (!isValidCPF(cpf)) {
      setCpfError(CPF_ERROR);
      toast.error(CPF_ERROR, { id: "registration-validation" });
      form.querySelector<HTMLInputElement>("#cpf")?.focus();
      return;
    }
    if (getAuthPasswordRequirements(submittedPassword).some(({ met }) => !met)) {
      setPassword(submittedPassword);
      setPasswordError("Confira os requisitos da senha.");
      toast.error("Confira os requisitos da senha.", { id: "registration-validation" });
      form.querySelector<HTMLInputElement>("#password")?.focus();
      return;
    }

    setBusy(true);
    try {
      await authApiService.register({
        fullName: value(data, "fullName").trim(),
        email: value(data, "email").trim().toLowerCase(),
        cpf,
        phone: cleanDocument(value(data, "phone")),
        password: submittedPassword,
        invitation,
      });
      window.location.replace("/conta/seguranca");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível criar o usuário.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <AuthHeading>{invitation ? "Aceitar convite" : "Criar usuário"}</AuthHeading>
        <p className="text-sm text-muted-foreground">{invitation
          ? "Crie seu usuário com o endereço de e-mail que recebeu o convite."
          : "Use os dados da pessoa responsável pelo acesso."}</p>
      </header>
      <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
        <AuthField id="fullName" label="Nome completo" autoComplete="name" required maxLength={100} />
        <AuthField id="email" label="E-mail" type="email" autoComplete="email" required maxLength={254} />
        <div className="grid gap-4 lg:grid-cols-2">
          <AuthField
            id="cpf"
            label="CPF"
            mask="CPF"
            required
            error={cpfError}
            onBlur={(event) => {
              const cpf = event.currentTarget.value;
              setCpfError(cpf.trim() && !isValidCPF(cpf) ? CPF_ERROR : null);
            }}
            onChange={(event) => {
              if (cpfError && isValidCPF(event.currentTarget.value)) setCpfError(null);
            }}
          />
          <AuthField id="phone" label="Telefone" mask="PHONE" autoComplete="tel" required />
        </div>
        <div className="space-y-2">
          <AuthField
            id="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={AUTH_PASSWORD_MIN_LENGTH}
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            aria-describedby="registration-password-help"
            error={passwordError}
            onChange={(event) => {
              setPassword(event.currentTarget.value);
              if (passwordError) setPasswordError(null);
            }}
          />
          <PasswordRequirements id="registration-password-help" requirements={getAuthPasswordRequirements(password)} />
        </div>
        <ToastNotice message={error} persistent />
        <AuthActionButton pending={busy} pendingLabel="Criando usuário…" className="w-full">
          Criar usuário
        </AuthActionButton>
      </form>
      <Link href="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao login</Link>
    </section>
  );
}

export function LogoutButton({ compact = false }: { compact?: boolean } = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    if (busy) return;

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
      {compact ? (
        <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={busy ? "Encerrando sessão" : "Sair"}
          className="size-11 text-muted-foreground sm:w-auto sm:px-3" onClick={logout}>
          {busy ? <LoadingIndicator /> : <LogOut aria-hidden="true" />}
          <span className="hidden sm:inline">Sair</span>
        </Button>
      ) : (
        <AuthActionButton type="button" variant="outline" pending={busy} pendingLabel="Encerrando…" onClick={logout}>
          Sair
        </AuthActionButton>
      )}
      <ToastNotice message={error} persistent />
    </div>
  );
}
