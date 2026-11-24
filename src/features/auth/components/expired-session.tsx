"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { authEntry } from "@/lib/auth-navigation";
import { redirectExpiredSession } from "../session-expiry";

export function ExpiredSession({ returnTo }: { returnTo: string }) {
  useEffect(() => {
    redirectExpiredSession(returnTo);
  }, [returnTo]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <Button asChild variant="outline" className="h-11">
        <Link href={authEntry("/entrar", returnTo)} prefetch={false}>Ir para o login</Link>
      </Button>
    </main>
  );
}
