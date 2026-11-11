import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Button } from "@/components/ui/button";

export default function ServicoIndisponivelPage() {
  return (
    <AuthShell>
      <section className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Autenticação indisponível</h1>
        <p className="text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <Button asChild><Link href="/inicio">Tentar novamente</Link></Button>
      </section>
    </AuthShell>
  );
}
