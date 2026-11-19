"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { authApiService } from "@/services/auth-api.service";
import { finishSignIn } from "../finish-sign-in";
import type { RegistrationEmailChallenge } from "../registration-email-contract";
import { withSessionLock } from "../session-refresh";
import { AuthActionButton, AuthField, AuthHeading } from "./auth-form-controls";
import { AuthFormMotion } from "./auth-motion";
import { CodeSlots, useCodeVerification } from "./code-slots";
import { LogoutButton } from "./live-auth-forms";

function RegisteredAddress({ email }: { email: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-3.5">
      <Mail size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
      <strong className="min-w-0 wrap-anywhere text-sm font-semibold">{email}</strong>
    </div>
  );
}

function EmailCodeStep({ email, challenge, sending, onResend, onCorrect, onVerified, onChanged }: {
  email: string;
  challenge: RegistrationEmailChallenge;
  sending: boolean;
  onResend(): void;
  onCorrect?(): void;
  onVerified(): void;
  onChanged(): void;
}) {
  const [resendReady, setResendReady] = useState(() => Date.parse(challenge.resendAt) <= Date.now());
  const [expired, setExpired] = useState(false);
  const verification = useCodeVerification({
    verify: async (code: string) => {
      try {
        return await authApiService.verifyRegistrationEmailCode(challenge.challengeId, code);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "REGISTRATION_EMAIL_CODE_EXPIRED") setExpired(true);
          if (error.code === "REGISTRATION_EMAIL_NOT_PENDING") onChanged();
        }
        throw error;
      }
    },
    onSuccess: onVerified,
    isRejection: (failure) => failure instanceof ApiError && failure.code === "REGISTRATION_EMAIL_CODE_INVALID",
    failureMessage: "Não foi possível confirmar o e-mail.",
  });
  const verified = verification.field.status.status === "success";

  useEffect(() => {
    const timer = window.setTimeout(() => setResendReady(true), Math.max(0, Date.parse(challenge.resendAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [challenge.resendAt]);

  return (
    <>
      <header className="space-y-2">
        <AuthHeading className="text-balance">{verified ? "E-mail confirmado" : "Digite o código do e-mail"}</AuthHeading>
        {!verified && <p className="text-pretty text-sm text-muted-foreground">Confira a caixa de entrada de <strong className="wrap-anywhere font-semibold text-foreground">{email}</strong>.</p>}
      </header>
      {expired ? (
        <OperationFailure message="Este código expirou ou atingiu o limite de tentativas. Solicite outro código." />
      ) : (
        <CodeSlots id="registration-email-code" label="Código do e-mail" format="email-otp" autoFocus
          disabled={sending} pendingLabel="Confirmando e-mail…" successLabel="E-mail confirmado." {...verification.field} />
      )}
      {!verified && (
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <AuthActionButton type="button" variant="link" className="px-0" pending={sending} pendingLabel="Enviando…"
            disabled={!resendReady || verification.busy} onClick={onResend}>Reenviar código</AuthActionButton>
          {onCorrect && <Button type="button" variant="link" className="h-11 px-0" disabled={sending || verification.busy} onClick={onCorrect}>
            Corrigir e-mail
          </Button>}
        </div>
      )}
    </>
  );
}

export function RegistrationEmailStep({ userId, initialEmail, continueTo, allowCorrection = true }: {
  userId: string;
  initialEmail: string;
  continueTo: string;
  allowCorrection?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [challenge, setChallenge] = useState<RegistrationEmailChallenge>();
  const [correcting, setCorrecting] = useState(false);
  const [pending, setPending] = useState<"send" | "correct" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const busy = useRef(false);

  function failure(cause: unknown, fallback: string) {
    setError(cause instanceof Error ? cause.message : fallback);
    if (cause instanceof ApiError &&
        ["REGISTRATION_EMAIL_CHANGED", "REGISTRATION_EMAIL_NOT_PENDING"].includes(cause.code ?? "")) {
      router.refresh();
    }
  }

  function edit(active: boolean) {
    setError(null);
    setInvalidEmail(false);
    setCorrecting(active);
  }

  async function send(resend = false) {
    if (busy.current) return;
    busy.current = true;
    setPending("send");
    setError(null);
    try {
      setChallenge(await authApiService.requestRegistrationEmailCode(email, resend));
    } catch (cause) {
      failure(cause, "Não foi possível enviar o código.");
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  async function correct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const next = String(new FormData(form).get("registration-new-email") ?? "").trim().toLowerCase();
    if (next === email) {
      setInvalidEmail(true);
      setError("Informe um endereço diferente.");
      form.querySelector("input")?.focus();
      return;
    }
    busy.current = true;
    setPending("correct");
    setError(null);
    try {
      await withSessionLock(() => authApiService.correctRegistrationEmail(email, next));
      setEmail(next);
      setChallenge(undefined);
      edit(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "REGISTRATION_EMAIL_UNAVAILABLE") {
        setInvalidEmail(true);
        form.querySelector("input")?.focus();
      }
      failure(cause, "Não foi possível corrigir o e-mail.");
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <>
      <AuthFormMotion step={correcting ? -1 : challenge ? 1 : 0} animateOnMount={false}>
        <section className="space-y-5">
          {correcting ? (
            <>
              <header className="space-y-2">
                <AuthHeading className="text-balance">Corrigir e-mail</AuthHeading>
                <p className="text-pretty text-sm text-muted-foreground">Informe o endereço em que deseja receber o código.</p>
              </header>
              <form method="post" onSubmit={correct} aria-busy={pending === "correct"} className="space-y-4">
                <AuthField id="registration-new-email" label="Novo e-mail" type="email" autoComplete="email"
                  defaultValue={email} maxLength={254} required autoFocus readOnly={pending === "correct"}
                  aria-invalid={invalidEmail || undefined} error={invalidEmail ? error : null}
                  onChange={() => { setInvalidEmail(false); setError(null); }} />
                <AuthActionButton className="w-full" pending={pending === "correct"} pendingLabel="Salvando…">Salvar e-mail</AuthActionButton>
                <Button type="button" variant="ghost" className="h-11 px-0 text-muted-foreground"
                  disabled={pending === "correct"} onClick={() => edit(false)}><ArrowLeft aria-hidden="true" />Voltar</Button>
              </form>
            </>
          ) : challenge ? (
            <EmailCodeStep key={challenge.challengeId} email={email} challenge={challenge} sending={pending === "send"}
              onResend={() => void send(true)} onCorrect={allowCorrection ? () => edit(true) : undefined} onChanged={() => router.refresh()}
              onVerified={() => { void finishSignIn(userId, continueTo); }} />
          ) : (
            <>
              <header className="space-y-2">
                <AuthHeading className="text-balance">Confirmar e-mail</AuthHeading>
                <p className="text-pretty text-sm text-muted-foreground">Vamos enviar um código de seis dígitos para este endereço.</p>
              </header>
              <RegisteredAddress email={email} />
              <div className="grid gap-1">
                <AuthActionButton type="button" pending={pending === "send"} pendingLabel="Enviando…" onClick={() => void send()}>
                  Enviar código por e-mail
                </AuthActionButton>
                {allowCorrection && <Button type="button" variant="link" className="h-11 justify-self-center" disabled={pending === "send"} onClick={() => edit(true)}>
                  Corrigir e-mail
                </Button>}
              </div>
            </>
          )}
        </section>
      </AuthFormMotion>
      <ToastNotice message={error} persistent />
      <div className="mt-6"><LogoutButton compact /></div>
    </>
  );
}
