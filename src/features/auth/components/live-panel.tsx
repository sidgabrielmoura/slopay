import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./live-auth-forms";
import { SessionMonitor } from "./session-monitor";

export function LivePanel({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-20">
      <SessionMonitor />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <Link href="/inicio" className="font-semibold text-primary">SloPay</Link>
        <LogoutButton />
      </header>
      <section className="mt-10 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" asChild><Link href="/conta/seguranca">Segurança da conta</Link></Button>
      </section>
    </main>
  );
}
