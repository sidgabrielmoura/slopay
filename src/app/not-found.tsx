import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="size-16 rounded-2xl bg-secondary/60 flex items-center justify-center text-primary mb-5 border border-border">
        <Compass className="size-8" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        O endereço solicitado não existe ou foi modificado na demonstração.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/inicio">Retornar ao Início</Link>
        </Button>
      </div>
    </div>
  );
}
