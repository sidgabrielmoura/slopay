"use client";

import { useLayoutEffect, useRef } from "react";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";

export function ApiKeyIssuedContent({ name, secret, onClose, example = false }: {
  name: string;
  secret: string;
  onClose: () => void;
  example?: boolean;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const heading = example ? "Chave de exemplo criada" : "Chave de API criada";

  useLayoutEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(example ? "Chave de exemplo copiada." : "Chave de API copiada.");
    } catch {
      toast.error("Selecione a chave para copiá-la.");
    }
  }

  return (
    <>
      <header className="flex min-w-0 items-center gap-3 pr-6">
        <LoadingConfirmation size={40} animate />
        <DialogTitle ref={title} tabIndex={-1} className="text-balance text-xl leading-snug focus:outline-none">
          {heading}
        </DialogTitle>
      </header>

      <div className="grid min-w-0 gap-4 rounded-lg border bg-background p-4">
        <dl className="grid min-w-0 gap-4">
          <div className="grid gap-1">
            <dt className="text-xs text-muted-foreground">Nome da chave</dt>
            <dd className="wrap-anywhere text-sm font-medium">{name}</dd>
          </div>
          <div className="grid min-w-0 gap-1.5 border-t pt-3">
            <dt className="text-xs text-muted-foreground">Chave de API</dt>
            <dd className="min-w-0">
              <code className="block select-all wrap-anywhere font-mono text-sm leading-relaxed">{secret}</code>
            </dd>
          </div>
        </dl>
        <Button type="button" className="h-11 w-full sm:w-fit" onClick={() => void copyKey()}>
          <Copy aria-hidden="true" /> Copiar chave
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-surface px-3 py-2.5">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
        <DialogDescription className="text-pretty text-warning">
          O valor completo aparece apenas nesta etapa. Copie e guarde a chave antes de fechar.
        </DialogDescription>
      </div>

      <footer className="flex justify-end border-t pt-4">
        <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" onClick={onClose}>Concluir</Button>
      </footer>
    </>
  );
}
