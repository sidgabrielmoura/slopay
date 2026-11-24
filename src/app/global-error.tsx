"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (!error.digest) captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background font-sans text-foreground">
        <main className="grid min-h-dvh place-items-center p-6">
          <section className="max-w-sm space-y-4 text-center">
            <h1 className="text-balance text-2xl font-semibold">Não foi possível carregar a página</h1>
            <Button type="button" className="min-h-11" onClick={retry}>Tentar novamente</Button>
          </section>
        </main>
      </body>
    </html>
  );
}
