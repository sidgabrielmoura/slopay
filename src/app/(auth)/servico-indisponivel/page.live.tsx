import { AuthActionLink } from "@/features/auth/components/auth-action-link";
import { AuthHeading } from "@/features/auth/components/auth-form-controls";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function ServicoIndisponivelPage() {
  return (
    <AuthShell>
      <section className="space-y-5">
        <AuthHeading>Autenticação indisponível</AuthHeading>
        <p className="text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <AuthActionLink href="/inicio" pendingLabel="Tentando novamente…">Tentar novamente</AuthActionLink>
      </section>
    </AuthShell>
  );
}
