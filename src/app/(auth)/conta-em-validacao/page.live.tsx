import { redirect } from "next/navigation";
import { AuthHeading } from "@/features/auth/components/auth-form-controls";
import { AuthShell, accountSetupSteps } from "@/features/auth/components/auth-shell";
import { LogoutButton } from "@/features/auth/components/live-auth-forms";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { onboardingDestination, registrationCompletePath } from "@/lib/auth-navigation";
import { requireSession } from "@/lib/server/session";

export default async function ContaEmValidacaoPage() {
  const user = await requireSession("/conta-em-validacao");
  const destination = onboardingDestination(user);
  if (destination !== "/conta-em-validacao") {
    redirect(destination ?? registrationCompletePath(user));
  }
  if (user.role === "MERCHANT") redirect("/inicio");

  return (
    <AuthShell progress={{ steps: accountSetupSteps, current: 3 }}>
      <SessionMonitor />
      <section className="space-y-5">
        <header className="space-y-2">
          <AuthHeading>Conta em validação</AuthHeading>
          <p className="text-sm text-muted-foreground">Seu e-mail foi confirmado. O acesso ao painel aguarda a liberação da conta.</p>
        </header>
        <LogoutButton />
      </section>
    </AuthShell>
  );
}
