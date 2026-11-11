"use client";

import React, { useState, Suspense } from "react";
import NextLink from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { authApiService } from "@/services/auth-api.service";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Token de redefinição não encontrado ou link inválido.");
      toast.error("Token de redefinição ausente.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("A senha deve conter no mínimo 8 caracteres.");
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setErrorMessage("A senha deve conter ao menos: 1 letra maiúscula, 1 minúscula, 1 número e 1 símbolo especial.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas digitadas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApiService.resetPassword(token, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      window.history.replaceState(null, "", window.location.pathname);
      setIsSuccess(true);
      toast.success(res.message || "Senha redefinida com sucesso!");
    } catch (err: any) {
      setErrorMessage(err?.message || "Token inválido ou expirado. Solicite uma nova recuperação.");
      toast.error(err?.message || "Falha ao redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-left">
        <div className="size-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
          <CheckCircle2 className="size-5" />
        </div>
        <h1 className="text-[21px] font-semibold text-foreground tracking-[-0.02em] leading-[28px]">
          Senha alterada com sucesso!
        </h1>
        <p className="text-[13px] font-normal text-muted-foreground leading-[19px] mt-2">
          Suas credenciais foram atualizadas com segurança. Você já pode acessar sua conta utilizando a nova senha.
        </p>

        <div className="mt-6">
          <NextLink
            href="/entrar"
            className="w-full h-[38px] rounded-[6px] bg-primary text-primary-foreground font-semibold text-[12px] hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 cursor-pointer flex items-center justify-center"
          >
            Acessar conta
          </NextLink>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-left mb-6">
        <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
          <KeyRound className="size-4" />
        </div>
        <h1 className="text-[21px] font-semibold text-foreground tracking-[-0.02em] leading-[28px]">
          Redefinir sua senha
        </h1>
        <p className="text-[13px] font-normal text-muted-foreground leading-[19px] mt-[3px]">
          Crie uma nova senha segura para acessar sua conta corporativa
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 p-2.5 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2"
        >
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="leading-tight">{errorMessage}</span>
        </div>
      )}

      <form method="post" onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="block text-[11px] font-medium text-foreground tracking-tight mb-1"
          >
            Nova Senha
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              value={newPassword}
              autoComplete="new-password"
              maxLength={128}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full h-[38px] px-3 pr-9 rounded-[6px] border border-border bg-card/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground p-1 transition-colors cursor-pointer"
              aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-[11px] font-medium text-foreground tracking-tight mb-1"
          >
            Confirmar Nova Senha
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            autoComplete="new-password"
            maxLength={128}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
            className="w-full h-[38px] px-3 rounded-[6px] border border-border bg-card/40 text-[12px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            disabled={isLoading}
          />
        </div>

        <div className="p-2.5 rounded-[6px] bg-card/30 border border-border/60 text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Requisitos de segurança:</p>
          <p>• Mínimo de 8 caracteres</p>
          <p>• Ao menos uma letra maiúscula e uma minúscula</p>
          <p>• Ao menos um dígito numérico e um símbolo (!@#$...)</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[38px] mt-2 rounded-[6px] bg-primary text-primary-foreground font-semibold text-[12px] hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Salvando nova senha..." : "Salvar nova senha"}
        </button>
      </form>

      <div className="w-full text-center mt-5">
        <NextLink
          href="/entrar"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3" />
          <span>Voltar ao login</span>
        </NextLink>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell contentMaxWidthClass="max-w-[340px]">
      <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Carregando...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}
