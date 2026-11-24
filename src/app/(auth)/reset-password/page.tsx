"use client";

import { Suspense, useState, type FormEvent } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { AUTH_PASSWORD_MAX_LENGTH, getAuthPasswordRequirements } from "@/features/auth/auth-password";
import {
  AuthActionButton,
  AuthHeading,
  AuthLoadingStatus,
  AuthSuccessMark,
  PasswordRequirements,
} from "@/features/auth/components/auth-form-controls";
import { AuthFormMotion } from "@/features/auth/components/auth-motion";
import { AuthPasswordField } from "@/features/auth/components/auth-password-field";
import { AuthShell, recoverySteps } from "@/features/auth/components/auth-shell";
import { KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authApiService } from "@/services/auth-api.service";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestFailure, setRequestFailure] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const requirements = getAuthPasswordRequirements(newPassword);
  const confirmError = confirmTouched && confirmPassword && confirmPassword !== newPassword
    ? "As senhas digitadas não coincidem."
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    if (!token) {
      setRequestFailure("Token de redefinição não encontrado ou link inválido.");
      return;
    }

    if (requirements.some(({ met }) => !met)) {
      setPasswordError("Confira os requisitos da senha.");
      toast.error("Confira os requisitos da senha.", { id: "reset-password-validation" });
      form.querySelector<HTMLInputElement>("#new-password")?.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmTouched(true);
      toast.error("As senhas digitadas não coincidem.", { id: "reset-password-validation" });
      form.querySelector<HTMLInputElement>("#confirm-password")?.focus();
      return;
    }

    setRequestFailure("");
    setIsLoading(true);
    try {
      const res = await authApiService.resetPassword(token, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      window.history.replaceState(null, "", window.location.pathname);
      setIsSuccess(true);
      toast.success(res.message || "Senha redefinida com sucesso!");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : undefined;
      setRequestFailure(message || "Token inválido ou expirado. Solicite uma nova recuperação.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <AuthFormMotion step={1} animateOnMount={false} className="space-y-6">
        <header className="space-y-3">
          <AuthSuccessMark />
          <AuthHeading>Senha alterada com sucesso!</AuthHeading>
          <p className="text-sm text-muted-foreground">
            Suas credenciais foram atualizadas com segurança. Você já pode acessar sua conta utilizando a nova senha.
          </p>
        </header>
        <Button asChild className="h-11 w-full">
          <NextLink href="/entrar">Acessar conta</NextLink>
        </Button>
      </AuthFormMotion>
    );
  }

  return (
    <AuthFormMotion animateOnMount={false} className="space-y-6">
      <header className="space-y-2">
        <div aria-hidden="true" className="mb-3 grid size-10 place-items-center rounded-full bg-accent text-primary">
          <KeyRound className="size-4" />
        </div>
        <AuthHeading>Redefinir sua senha</AuthHeading>
        <p className="text-sm text-muted-foreground">
          Crie uma nova senha segura para acessar sua conta corporativa
        </p>
      </header>

      <form method="post" onSubmit={handleSubmit} aria-busy={isLoading} className="space-y-4">
        <div className="space-y-2">
          <AuthPasswordField
            id="new-password"
            label="Nova senha"
            required
            value={newPassword}
            autoComplete="new-password"
            maxLength={AUTH_PASSWORD_MAX_LENGTH}
            aria-describedby="reset-password-help"
            error={passwordError}
            disabled={isLoading}
            onChange={(event) => {
              setNewPassword(event.currentTarget.value);
              if (passwordError) setPasswordError(null);
            }}
          />
          <PasswordRequirements id="reset-password-help" requirements={requirements} />
        </div>

        <AuthPasswordField
          id="confirm-password"
          label="Confirmar nova senha"
          required
          value={confirmPassword}
          autoComplete="new-password"
          maxLength={AUTH_PASSWORD_MAX_LENGTH}
          error={confirmError}
          onChange={(event) => setConfirmPassword(event.currentTarget.value)}
          onBlur={() => {
            setConfirmTouched(true);
            if (confirmPassword && confirmPassword !== newPassword) {
              toast.error("As senhas digitadas não coincidem.", { id: "reset-password-validation" });
            }
          }}
          disabled={isLoading}
        />
        {requestFailure && <OperationFailure message={requestFailure} />}
        <AuthActionButton pending={isLoading} pendingLabel="Salvando nova senha…" className="w-full">
          Salvar nova senha
        </AuthActionButton>
      </form>

      <NextLink href="/entrar" className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar ao login
      </NextLink>
    </AuthFormMotion>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell contentMaxWidthClass="max-w-[380px]" progress={{ steps: recoverySteps, current: 1 }}>
      <Suspense fallback={<AuthLoadingStatus>Carregando redefinição…</AuthLoadingStatus>}>
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}
