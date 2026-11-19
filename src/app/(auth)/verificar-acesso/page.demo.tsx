"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { AuthHeading } from "@/features/auth/components/auth-form-controls";
import { AuthShell, loginSteps } from "@/features/auth/components/auth-shell";
import { CodeSlots, useCodeVerification } from "@/features/auth/components/code-slots";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function VerificarAcessoPage() {
  const router = useRouter();
  const verification = useCodeVerification({
    verify: () => new Promise<void>((resolve) => window.setTimeout(resolve, 400)),
    onSuccess: () => router.push("/inicio"),
    failureMessage: "Não foi possível verificar o código.",
  });

  return (
    <AuthShell contentMaxWidthClass="max-w-[320px]" progress={{ steps: loginSteps, current: 1 }}>
      <section className="space-y-6">
        <header className="space-y-2">
          <div aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-accent text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <AuthHeading>Verificação de dois fatores</AuthHeading>
          <p className="text-sm text-muted-foreground">
            Digite o código temporário de 6 dígitos gerado no seu aplicativo autenticador
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <CodeSlots
              id="two-factor-code"
              label="Código de verificação"
              format="totp"
              autoFocus
              describedBy="demo-code-help"
              successLabel="Autenticação em dois fatores confirmada."
              {...verification.field}
            />
            <p id="demo-code-help" className="text-xs text-muted-foreground">
              Dica: digite quaisquer 6 dígitos (ex: <strong className="text-foreground">123456</strong>)
            </p>
          </div>

          <div className="p-2.5 rounded-[6px] bg-card/30 border border-border/60 text-[11px] flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>Sessão protegida por criptografia de ponta a ponta.</span>
          </div>
        </div>

        <NextLink href="/entrar" className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar ao login
        </NextLink>
      </section>
    </AuthShell>
  );
}
