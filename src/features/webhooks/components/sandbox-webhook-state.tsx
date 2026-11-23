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
  if (webhook.interruptedAt) return <Badge variant="warning">Fila interrompida</Badge>;
  return <Badge variant={webhook.enabled ? "success" : "secondary"}>{webhook.enabled ? "Ativo" : "Pausado"}</Badge>;
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

  const unavailable = error instanceof ApiError && error.status === 404;
  return (
    <Card>
      <Empty icon={<Webhook aria-hidden="true" />} className="rounded-none border-0"
        title={unlinked ? (development ? "Conta Sandbox aguardando vínculo" : "Conta aguardando habilitação") : "Webhooks indisponíveis"}
        description={unlinked ? "A equipe do Slopay vincula a conta antes de habilitar o cadastro de destinos."
          : unavailable ? "A configuração de destinos estará disponível quando a integração estiver habilitada."
            : "Tente carregar os dados novamente."}
        action={!unlinked && !unavailable && retry && <Button type="button" variant="outline" onClick={retry}>Tentar novamente</Button>} />
    </Card>
  );
}

