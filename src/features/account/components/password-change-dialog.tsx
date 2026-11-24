"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { stepperSpring } from "@/components/ui/stepper-motion";
import { LoadingConfirmation, OperationFailure } from "@/components/ui/loading-indicator";
import { AUTH_PASSWORD_MAX_LENGTH, getAuthPasswordRequirements } from "@/features/auth/auth-password";
import {
  AuthActionButton, PasswordRequirements,
} from "@/features/auth/components/auth-form-controls";
import { AuthPasswordField } from "@/features/auth/components/auth-password-field";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import type { PasswordChangeChallenge, PasswordChangeGrant } from "@/features/auth/password-change-contract";
import { withSessionLock } from "@/features/auth/session-refresh";
import { ApiError } from "@/lib/api-client";
import { authApiService } from "@/services/auth-api.service";

const steps = ["E-mail", "Código", "Nova senha"] as const;
const titles = {
  email: "Confirme seu e-mail",
  code: "Digite o código",
  password: "Crie uma nova senha",
  complete: "Senha redefinida",
};
const descriptions = {
  email: "Vamos enviar um código de confirmação para o seu endereço cadastrado.",
  code: "Digite o código de seis dígitos enviado ao seu e-mail.",
  password: "Escolha e confirme a nova senha de acesso.",
  complete: "Sua senha foi atualizada e as outras sessões foram encerradas.",
};

type FlowStep =
  | { name: "email" }
  | { name: "code"; challenge: PasswordChangeChallenge }
  | { name: "password"; challengeId: string; authorization: PasswordChangeGrant }
  | { name: "complete" };

function PasswordChangeSteps({ current }: { current: number }) {
  return (
    <ol aria-label="Etapas da redefinição" className="grid grid-cols-3 gap-1.5 pr-9">
      {steps.map((label, index) => (
        <li key={label} aria-current={index === current ? "step" : undefined} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="sr-only">{label}</span>
          <span aria-hidden="true" className="block h-full origin-left rounded-full bg-primary transition-transform duration-[560ms] motion-reduce:transition-none"
            style={{ transform: `scaleX(${index <= current ? 1 : 0})`, transitionTimingFunction: stepperSpring }} />
        </li>
      ))}
    </ol>
  );
}

function confirmationExpired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "PASSWORD_CHANGE_EXPIRED";
}

function VerifyEmailCode({ challenge, sending, onResend, onVerified }: {
  challenge: PasswordChangeChallenge;
  sending: boolean;
  onResend(): void;
  onVerified(authorization: PasswordChangeGrant): void;
}) {
  const [expired, setExpired] = useState(false);
  const [resendReady, setResendReady] = useState(() => Date.parse(challenge.resendAt) <= Date.now());
  const verification = useCodeVerification({
    verify: async (code: string) => {
      try {
        return await authApiService.verifyPasswordChange(challenge.challengeId, code);
      } catch (error) {
        if (confirmationExpired(error)) {
          setExpired(true);
        }
        throw error;
      }
    },
    onSuccess: onVerified,
    isRejection: (error) => error instanceof ApiError && error.code === "PASSWORD_CHANGE_CODE_INVALID",
    failureMessage: "Não foi possível verificar o código.",
  });

  useEffect(() => {
    const resendTimer = window.setTimeout(() => setResendReady(true), Math.max(0, Date.parse(challenge.resendAt) - Date.now()));
    return () => window.clearTimeout(resendTimer);
  }, [challenge.resendAt]);

  return (
    <div className="grid min-w-0 gap-3">
      {expired ? (
        <OperationFailure message="O código expirou. Solicite um novo código para continuar." />
      ) : (
        <CodeSlots id="password-change-code" label="Código do e-mail" format="email-otp"
          autoFocus disabled={sending} successLabel="E-mail confirmado." {...verification.field} />
      )}
      <Button type="button" variant="link" className="h-11 justify-self-start px-0"
        disabled={!resendReady || verification.busy || sending} onClick={onResend}>
        {sending ? "Enviando…" : "Reenviar código"}
      </Button>
    </div>
  );
}

function NewPasswordForm({ onSaved, onExpired, challengeId, authorization }: {
  onSaved(): void;
  onExpired(message: string): void;
  challengeId: string;
  authorization: PasswordChangeGrant;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState<"password" | "confirmation" | null>(null);
  const [failure, setFailure] = useState("");
  const requirements = getAuthPasswordRequirements(password);
  const passwordError = "Confira os requisitos da senha.";
  const confirmationError = "As senhas digitadas não coincidem.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    if (requirements.some(({ met }) => !met)) {
      setInvalid("password");
      toast.error(passwordError);
      form.querySelector<HTMLInputElement>("#password-change-new")?.focus();
      return;
    }
    if (password !== confirmation) {
      setInvalid("confirmation");
      toast.error(confirmationError);
      form.querySelector<HTMLInputElement>("#password-change-confirm")?.focus();
      return;
    }

    setFailure("");
    setSaving(true);
    try {
      await withSessionLock(() => authApiService.completePasswordChange(challengeId, authorization.grant, password));
      onSaved();
    } catch (error) {
      if (confirmationExpired(error)) onExpired(error.message);
      else setFailure(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={saving} className="grid gap-4">
      <div className="grid gap-2">
        <AuthPasswordField id="password-change-new" label="Nova senha"
          autoFocus required autoComplete="new-password" maxLength={AUTH_PASSWORD_MAX_LENGTH}
          aria-describedby="password-change-requirements" error={invalid === "password" ? passwordError : null}
          readOnly={saving} value={password}
          onChange={(event) => { setInvalid(null); setPassword(event.currentTarget.value); }} />
        <PasswordRequirements id="password-change-requirements" requirements={requirements} />
      </div>
      <AuthPasswordField id="password-change-confirm" label="Confirmar nova senha"
        required autoComplete="new-password" maxLength={AUTH_PASSWORD_MAX_LENGTH}
        readOnly={saving} value={confirmation} error={invalid === "confirmation" ? confirmationError : null}
        onChange={(event) => { setInvalid(null); setConfirmation(event.currentTarget.value); }} />
      {failure && <OperationFailure message={failure} />}
      <AuthActionButton pending={saving} pendingLabel="Salvando senha…" className="w-full">Finalizar</AuthActionButton>
    </form>
  );
}

function PasswordChangeFlow({ userId, email }: { userId: string; email: string }) {
  const [step, setStep] = useState<FlowStep>({ name: "email" });
  const [sending, setSending] = useState(false);
  const [requestFailure, setRequestFailure] = useState("");
  const current = step.name === "email" ? 0 : step.name === "code" ? 1 : step.name === "password" ? 2 : 3;

  async function sendCode(resend: boolean) {
    if (sending) return;
    setRequestFailure("");
    setSending(true);
    try {
      const challenge = await authApiService.requestPasswordChange(userId, email, resend);
      setStep({ name: "code", challenge });
    } catch (error) {
      setRequestFailure(error instanceof Error ? error.message : "Não foi possível enviar o código.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <PasswordChangeSteps current={current} />
      <header className="grid gap-2">
        {step.name === "complete" && <div className="mb-1"><LoadingConfirmation size={56} animate /></div>}
        <DialogTitle className="text-balance text-xl leading-tight">{titles[step.name]}</DialogTitle>
        <DialogDescription className="text-pretty">{descriptions[step.name]}</DialogDescription>
      </header>
      {requestFailure && <OperationFailure message={requestFailure} />}
      {step.name === "email" && (
        <div className="grid gap-4">
          <p className="wrap-anywhere text-base font-semibold">{email}</p>
          <AuthActionButton type="button" pending={sending} pendingLabel="Enviando código…" onClick={() => void sendCode(false)}>
            Confirmar e-mail
          </AuthActionButton>
        </div>
      )}
      {step.name === "code" && (
        <VerifyEmailCode key={step.challenge.challengeId} challenge={step.challenge} sending={sending}
          onResend={() => void sendCode(true)}
          onVerified={(authorization) => {
            setRequestFailure("");
            setStep({ name: "password", challengeId: step.challenge.challengeId, authorization });
          }} />
      )}
      {step.name === "password" && (
        <NewPasswordForm challengeId={step.challengeId} authorization={step.authorization}
          onSaved={() => setStep({ name: "complete" })} onExpired={(message) => {
            setRequestFailure(message);
            setStep({ name: "email" });
          }} />
      )}
      {step.name === "complete" && (
        <DialogClose asChild><Button type="button" autoFocus className="h-11 w-full">Fechar</Button></DialogClose>
      )}
    </div>
  );
}

export function PasswordChangeDialog({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline" className="h-11">Redefinir por e-mail</Button></DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}>
        {open && <PasswordChangeFlow userId={userId} email={email} />}
      </DialogContent>
    </Dialog>
  );
}
