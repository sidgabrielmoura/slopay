"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function VerificarAcessoPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Autenticação 2FA confirmada com sucesso!");
      router.push("/inicio");
    }, 400);
  };

  return (
    <AuthShell contentMaxWidthClass="max-w-[320px]">
      <div className="w-full">
        <div className="text-left mb-6">
          <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
            <ShieldCheck className="size-4" />
          </div>
          <h1 className="text-[21px] font-semibold text-foreground tracking-[-0.02em] leading-[28px]">
            Verificação de dois fatores
          </h1>
          <p className="text-[13px] font-normal text-muted-foreground leading-[19px] mt-[3px]">
            Digite o código temporário de 6 dígitos gerado no seu aplicativo autenticador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label
              htmlFor="two-factor-code"
              className="block text-[11px] font-medium text-foreground tracking-tight mb-1"
            >
              Código de verificação
            </label>
            <input
              id="two-factor-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full h-[42px] px-3 rounded-[6px] border border-border bg-card/40 text-center font-mono text-[18px] tracking-[0.25em] text-foreground placeholder:text-muted-foreground/30 transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              autoFocus
              required
              disabled={isLoading}
            />
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              Dica: digite quaisquer 6 dígitos (ex: <strong className="text-foreground">123456</strong>)
            </p>
          </div>

          <div className="p-2.5 rounded-[6px] bg-card/30 border border-border/60 text-[11px] flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>Sessão protegida por criptografia de ponta a ponta.</span>
          </div>

          <button
            type="submit"
            disabled={code.length !== 6 || isLoading}
            className="w-full h-[38px] mt-2 rounded-[6px] bg-primary text-primary-foreground font-semibold text-[12px] hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Validando..." : "Confirmar e acessar"}
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
    </AuthShell>
  );
}
