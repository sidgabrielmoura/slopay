"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveMfa } from "@/features/auth/components/live-mfa";
import { PasskeySettings } from "@/features/auth/components/passkey-settings";
import { formatDateTime } from "@/lib/dates";
import { authApiService } from "@/services/auth-api.service";
import { PasswordChangeDialog } from "./password-change-dialog";
import { SecurityCard, SecurityLayout } from "./security-layout";

export function LiveSecurityScreen({ userId, email }: { userId: string; email: string }) {
  const session = useQuery({
    queryKey: ["security-session", userId],
    queryFn: () => authApiService.sessionStatus(),
    retry: false,
    staleTime: 60_000,
  });
  const status = session.data;

  return (
    <SecurityLayout>
      <LiveMfa
        userId={userId}
        enabled
        panelPath="/inicio"
        showLogout={false}
        panel={{ biometrics: <PasskeySettings userId={userId} returnTo="/conta/seguranca" /> }}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SecurityCard title="Sessão atual">
          {status ? (
            <dl className="grid gap-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd><Badge variant={status.state === "active" ? "success" : "warning"}>{status.state === "active" ? "Ativa" : "Aguardando renovação"}</Badge></dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Validade máxima</dt>
                <dd className="font-medium tabular-nums">
                  <time dateTime={status.absoluteExpiresAt}>{formatDateTime(status.absoluteExpiresAt, "short")}</time>
                </dd>
              </div>
            </dl>
          ) : session.isPending ? (
            <div className="grid gap-2" aria-busy="true">
              <span role="status" className="sr-only">Consultando sessão</span>
              <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-32 motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Dados da sessão indisponíveis.</p>
              <Button type="button" variant="outline" className="h-11" disabled={session.isFetching} onClick={() => void session.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}
        </SecurityCard>
        <SecurityCard title="Senha de acesso">
          <p className="mb-3 text-pretty text-sm text-muted-foreground">Confirme seu e-mail para criar uma nova senha.</p>
          <PasswordChangeDialog userId={userId} email={email} />
        </SecurityCard>
      </div>
    </SecurityLayout>
  );
}
