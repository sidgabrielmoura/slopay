"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { SandboxRequestHistory } from "@/features/integrations/components/sandbox-request-history";
import { formatDateTime } from "@/lib/dates";
import { sandboxWebhookGateway, sandboxWebhooksKey } from "../sandbox-webhook-gateway";
import { webhookAttemptLabels, webhookAttemptMessage, webhookDeliveryLabels as labels } from "../webhook-delivery-display";
import { webhookDeliveryState, type SandboxWebhookDelivery } from "../sandbox-webhooks";
import { webhookEvents } from "../webhooks";
import { SandboxWebhookActionDialog, type WebhookReview } from "./sandbox-webhook-action-dialog";

const filters = [{ value: "all", label: "Todos os status" }, ...webhookDeliveryState.options.map((value) => ({ value, label: labels[value] }))];

function Outcome({ delivery }: { delivery: SandboxWebhookDelivery }) {
  return (
    <Badge variant={delivery.state === "DELIVERED" ? "success" : delivery.state === "EXHAUSTED" ? "warning" : "secondary"}>
      {delivery.sending ? "Em envio" : labels[delivery.state]}
    </Badge>
  );
}

export function SandboxWebhookLogs({ accountId, initialTab, webhookId }: {
  accountId: string;
  initialTab: "webhooks" | "requisicoes";
  webhookId?: string;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading title="Logs de integração" description="Acompanhe as chamadas à API e as entregas de webhooks." />
      <Tabs defaultValue={initialTab} className="min-w-0">
        <TabsList aria-label="Tipos de log" className="grid h-auto w-full grid-cols-2 justify-start sm:inline-grid sm:w-auto">
          <TabsTrigger value="webhooks" className="min-h-10">Webhooks</TabsTrigger>
          <TabsTrigger value="requisicoes" className="min-h-10">Requisições</TabsTrigger>
        </TabsList>
        <TabsContent value="webhooks"><DeliveryHistory accountId={accountId} webhookId={webhookId} /></TabsContent>
        <TabsContent value="requisicoes"><SandboxRequestHistory accountId={accountId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function DeliveryHistory({ accountId, webhookId }: { accountId: string; webhookId?: string }) {
  const [state, setState] = useState<SandboxWebhookDelivery["state"] | "all">("all");
  const [pages, setPages] = useState<string[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [review, setReview] = useState<WebhookReview | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const filter = { webhookId, state: state === "all" ? undefined : state, before: pages.at(-1) };
  const deliveries = useQuery({
    queryKey: [...sandboxWebhooksKey(accountId), "logs", filter],
    queryFn: ({ signal }) => sandboxWebhookGateway.logs(filter, signal),
    retry: false, refetchInterval: 10_000,
  });
  const more = deliveries.data?.nextCursor;

  function restoreFocus() {
    (origin.current?.isConnected ? origin.current : heading.current)?.focus();
  }

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
          <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">Histórico de entregas</h2>
          <GlideSelect ariaLabel="Filtrar entregas por status" size="lg" options={filters} value={state}
            onChange={(value) => {
              const selected = webhookDeliveryState.safeParse(value);
              setState(selected.success ? selected.data : "all");
              setPages([]);
            }} className="w-full sm:w-52" />
        </CardHeader>
        {deliveries.isPending ? (
          <div className="grid gap-3 p-5" aria-busy="true" aria-label="Carregando entregas">
            <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
          </div>
        ) : deliveries.isError ? (
          <Empty title="Histórico indisponível" icon={<Webhook aria-hidden="true" />} className="rounded-none border-0"
            action={<Button type="button" variant="outline" onClick={() => void deliveries.refetch()}>Tentar novamente</Button>} />
        ) : deliveries.data.items.length === 0 ? (
          <Empty title="Nenhuma entrega neste filtro" icon={<Webhook aria-hidden="true" />} className="rounded-none border-0" />
        ) : (
          <ul className="divide-y divide-border">
            {deliveries.data.items.map((delivery) => (
              <li key={delivery.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{webhookEvents[delivery.event.type].label}</h3>
                    <Outcome delivery={delivery} />
                  </div>
                  <p className="wrap-anywhere text-xs text-muted-foreground">
                    {delivery.endpoint.name} · {formatDateTime(delivery.createdAt, "short")}
                  </p>
                  {delivery.lastAttempt && <p className="text-xs tabular-nums text-muted-foreground">
                    {webhookAttemptMessage(delivery.lastAttempt)} · {delivery.attemptCount} {delivery.attemptCount === 1 ? "tentativa" : "tentativas"}
                  </p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {delivery.canRetry && <Button type="button" variant="outline" size="sm" onClick={(event) => {
                    origin.current = event.currentTarget;
                    setReview({
                      name: delivery.endpoint.name,
                      action: { kind: "retry", id: delivery.id, version: delivery.endpoint.version },
                    });
                  }}><RotateCcw aria-hidden="true" data-icon="inline-start" /> Reenviar</Button>}
                  <Button type="button" variant="ghost" size="sm" onClick={(event) => {
                    origin.current = event.currentTarget;
                    setSelection(delivery.id);
                  }}>Detalhes</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {(pages.length > 0 || more) && <div className="flex flex-wrap justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" disabled={!pages.length}
            onClick={() => setPages((current) => current.slice(0, -1))}>Anteriores</Button>
          <Button type="button" variant="outline" disabled={!more}
            onClick={() => { if (more) setPages((current) => [...current, more]); }}>Próximas</Button>
        </div>}
      </Card>
      <DeliveryDetail accountId={accountId} id={selection} close={() => setSelection(null)} restoreFocus={restoreFocus} />
      {review && <SandboxWebhookActionDialog accountId={accountId} review={review}
        onClose={() => setReview(null)} restoreFocus={restoreFocus} />}
    </>
  );
}

function DeliveryDetail({ accountId, id, close, restoreFocus }: {
  accountId: string; id: string | null; close: () => void; restoreFocus: () => void;
}) {
  const detail = useQuery({
    queryKey: [...sandboxWebhooksKey(accountId), "delivery", id],
    queryFn: ({ signal }) => sandboxWebhookGateway.delivery(id!, signal),
    retry: false, enabled: Boolean(id),
  });
  const data = detail.data;
  return (
    <Dialog open={id !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl"
        onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }}>
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>{data ? webhookEvents[data.event.type].label : "Detalhes da entrega"}</DialogTitle>
          <DialogDescription className="wrap-anywhere">{data?.endpoint.name ?? "Histórico de tentativas do evento."}</DialogDescription>
        </DialogHeader>
        {detail.isPending ? <Skeleton className="h-24 w-full" /> : detail.isError ? (
          <Empty icon={<Webhook aria-hidden="true" />} title="Entrega indisponível"
            action={<Button type="button" variant="outline" onClick={() => void detail.refetch()}>Tentar novamente</Button>} />
        ) : data && (
          <div className="grid min-w-0 gap-4">
            <dl className="grid min-w-0 grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
              <div className="col-span-2 min-w-0"><dt className="text-xs text-muted-foreground">ID do evento</dt>
                <dd className="mt-1 wrap-anywhere font-mono text-xs">{data.event.id}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-1"><Outcome delivery={data} /></dd></div>
              {data.nextAttemptAt && <div><dt className="text-xs text-muted-foreground">Disponível a partir de</dt>
                <dd className="mt-1 tabular-nums">{formatDateTime(data.nextAttemptAt, "short")}</dd></div>}
            </dl>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">Tentativas registradas</h3>
              {data.attempts.length === 0 ? <p className="text-sm text-muted-foreground">Aguardando o primeiro envio.</p> : (
                <ul className="divide-y divide-border rounded-lg border">
                  {data.attempts.map((attempt) => (
                    <li key={attempt.number} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                      <div><p className="font-medium">{webhookAttemptMessage(attempt)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Tentativa {attempt.number} · {webhookAttemptLabels[attempt.state]}</p></div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        <time dateTime={attempt.startedAt}>{formatDateTime(attempt.startedAt, "short")}</time>
                        {attempt.durationMs !== null && ` · ${attempt.durationMs} ms`}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

