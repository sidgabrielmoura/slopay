import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LogoutButton, ResendVerificationButton } from "@/features/auth/components/live-auth-forms";
import { requireSession } from "@/lib/server/session";

export default async function ContaEmValidacaoPage() {
  const user = await requireSession("/conta-em-validacao");
  if (user.status === "ACTIVE" && user.isEmailVerified) {
    redirect(user.isTwoFactorEnabled && user.mfaVerified
      ? user.role === "ADMIN" ? "/admin" : "/inicio"
      : "/conta/seguranca");
  }

  return (
    <AuthShell>
      <section className="space-y-5">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Confirme seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Use o link de confirmação enviado para <strong className="text-foreground">{user.email}</strong> antes de continuar.
          </p>
        </header>
        <Button asChild><Link href="/verify-email">Informar código de confirmação</Link></Button>
        <ResendVerificationButton />
        <LogoutButton />
      </section>
    </AuthShell>
  );
}
