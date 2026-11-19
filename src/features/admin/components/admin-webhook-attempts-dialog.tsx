"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { webhookAttemptLabels, webhookAttemptMessage } from "@/features/webhooks/webhook-delivery-display";
import { webhookEvents } from "@/features/webhooks/webhooks";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { retryAdminRead } from "../admin-query";
import { adminWebhooks } from "../admin-webhooks";
import { DeliveryStatus, WebhookRowsSkeleton } from "./admin-webhook-display";

const duration = new Intl.NumberFormat("pt-BR");

function AttemptHistory({ userId, webhookId, deliveryId }: { userId: string; webhookId: string; deliveryId: string }) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["admin-webhook-attempts", userId, webhookId, deliveryId, page],
    queryFn: ({ signal }) => adminWebhooks.delivery(webhookId, deliveryId, page, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === userId &&
      previous.queryKey[2] === webhookId && previous.queryKey[3] === deliveryId ? data : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const status = result.error instanceof ApiError ? result.error.status : undefined;
  const data = status && [401, 403, 404].includes(status) ? undefined : result.data;
  const loading = result.isPending || result.isPlaceholderData;

  return (
    <>
      <ToastNotice message={result.error?.message} />
      {data && (
        <div className="min-w-0 border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-pretty text-sm font-semibold">{webhookEvents[data.delivery.eventType].label}</p>
            <DeliveryStatus delivery={data.delivery} />
          </div>
          <p className="mt-2 wrap-anywhere font-mono text-xs text-muted-foreground">Evento {data.delivery.eventId}</p>
          {data.delivery.previousDestination && <p className="mt-1 text-sm text-muted-foreground">Entrega de uma configuração anterior do destino.</p>}
        </div>
      )}
      {loading && <span role="status" className="sr-only">Carregando tentativas de entrega</span>}
      <SkeletonReveal flow revealed={!loading} skeleton={<WebhookRowsSkeleton rows={2} />}>
        {data?.attempts.length ? (
          <ol aria-label="Histórico de tentativas" className="divide-y divide-border">
            {data.attempts.map((attempt) => (
              <li key={attempt.number} className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="text-pretty text-sm font-medium">{webhookAttemptMessage(attempt)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">Tentativa {attempt.number} · {webhookAttemptLabels[attempt.state]}</p>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  <time dateTime={attempt.startedAt}>{formatDateTime(attempt.startedAt)}</time>
                  {attempt.durationMs !== null && <span> · {duration.format(attempt.durationMs)} ms</span>}
                </div>
              </li>
            ))}
          </ol>
        ) : data ? (
          <p className="py-5 text-pretty text-sm text-muted-foreground">Esta entrega aguarda a primeira tentativa de envio.</p>
        ) : result.isError && (
          <div className="grid justify-items-start gap-3 py-4">
            <p className="text-sm font-medium">{status === 404 ? "Entrega de webhook não encontrada." : "A consulta das tentativas está indisponível."}</p>
            {status !== 404 && <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>}
          </div>
        )}
      </SkeletonReveal>
      {data && data.pagination.total > 0 && <TablePagination {...data.pagination} busy={loading}
        onPageChange={setPage} label="Paginação das tentativas" />}
    </>
  );
}

export function AdminWebhookAttemptsDialog({ userId, webhookId, deliveryId, close, restoreFocus }: {
  userId: string;
  webhookId: string;
  deliveryId: string | null;
  close: () => void;
  restoreFocus: (event: Event) => void;
}) {
  return (
    <Dialog open={deliveryId !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:grid [&>button:last-child]:size-11 [&>button:last-child]:place-items-center"
        onCloseAutoFocus={restoreFocus}>
        <DialogHeader className="border-b border-border p-4 pr-16 text-left sm:px-6 sm:py-5 sm:pr-16">
          <DialogTitle className="text-balance leading-snug">Tentativas de entrega</DialogTitle>
          <DialogDescription className="text-pretty">Respostas e duração registradas a cada envio ao destino.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 min-w-0 content-start gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:px-6">
          {deliveryId && <AttemptHistory key={deliveryId} userId={userId} webhookId={webhookId} deliveryId={deliveryId} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
