"use client";

import { Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import type { SandboxWebhook } from "../sandbox-webhooks";

export function SandboxWebhookBadge({ webhook }: { webhook: SandboxWebhook }) {
  if (!webhook.verifiedAt) return <Badge variant="secondary">Aguardando verificação</Badge>;
  if (!webhook.enabled) return <Badge variant="secondary">Pausado</Badge>;
  if (webhook.interruptedAt) return <Badge variant="warning">Fila interrompida</Badge>;
  return <Badge variant="success">Ativo</Badge>;
}

export function SandboxWebhookFallback({ pending, error, unlinked, retry, development }: {
  pending?: boolean;
  error?: Error | null;
  unlinked?: boolean;
  development: boolean;
  retry?: () => void;
}) {
  if (pending) return (
    <Card className="grid gap-3 p-5" aria-busy="true" aria-label="Carregando webhooks">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </Card>
  );

  const missing = error instanceof ApiError && error.code === "WEBHOOK_NOT_FOUND";
  const disabled = !missing && error instanceof ApiError && error.status === 404;
  return (
    <Card>
      <Empty icon={<Webhook aria-hidden="true" />} className="rounded-none border-0"
        title={unlinked ? (development ? "Conta Sandbox aguardando vínculo" : "Conta aguardando habilitação")
          : missing ? "Webhook não encontrado" : disabled ? "Webhooks desativados" : "Webhooks indisponíveis"}
        description={unlinked ? (development ? "A equipe do Slopay precisa vincular a conta." : "O cadastro de destinos é liberado após a conclusão da abertura da conta.")
          : disabled ? "O cadastro de destinos depende da habilitação da integração neste ambiente."
            : missing ? "Volte à lista para consultar os destinos da sua conta." : "Tente carregar os dados novamente."}
        action={!unlinked && !disabled && !missing && retry && <Button type="button" variant="outline" onClick={retry}>Tentar novamente</Button>} />
    </Card>
  );
}

