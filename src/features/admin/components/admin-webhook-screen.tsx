"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { webhookIdSchema } from "@/features/webhooks/sandbox-webhooks";
import { webhookAttemptMessage, webhookDeliveryLabels } from "@/features/webhooks/webhook-delivery-display";
import { webhookEvents } from "@/features/webhooks/webhooks";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { retryAdminRead } from "../admin-query";
import {
  adminDeliveryStateFilter, adminWebhookHref, adminWebhookQueryFrom, adminWebhooks, webhookHistoryQueryFrom,
  type AdminWebhookHistory, type WebhookHistoryQuery,
} from "../admin-webhooks";
import { AdminWebhookAttemptsDialog } from "./admin-webhook-attempts-dialog";
import { DeliveryStatus, WebhookRowsSkeleton, WebhookStatus } from "./admin-webhook-display";
import { CompanyField, CompanyReadError } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const count = new Intl.NumberFormat("pt-BR");
const stateOptions = adminDeliveryStateFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : value === "PENDING" ? "Pendentes" : webhookDeliveryLabels[value],
}));
type Delivery = AdminWebhookHistory["items"][number];
type OpenDelivery = (id: string, source: HTMLButtonElement) => void;

function WebhookProfile({ history, openDelivery }: { history: AdminWebhookHistory; openDelivery: OpenDelivery }) {
  const development = useDevelopmentFeatures();
  const { webhook, queued, blockedDeliveryId } = history;
  return (
    <>
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-balance wrap-anywhere text-2xl font-semibold sm:text-3xl">{webhook.name}</h1>
          <p className="wrap-anywhere text-sm text-muted-foreground">{webhook.company}{webhook.host && " · " + webhook.host}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {development && <Badge variant="secondary">Sandbox</Badge>}<WebhookStatus status={webhook.status} />
        </div>
      </header>
      <Card className="min-w-0" aria-labelledby="webhook-profile">
        <div className="grid min-w-0 gap-4 p-4 sm:p-5">
          <h2 id="webhook-profile" className="text-balance text-lg font-semibold">Configuração do destino</h2>
          <dl className="grid min-w-0 gap-4 sm:grid-cols-3">
            <CompanyField label="Modo de entrega">
              {webhook.mode === "SEQUENTIAL" ? "Sequencial" : "Não sequencial"}
              <span className="block text-xs text-muted-foreground">{webhook.retryEnabled ? "Retentativas automáticas habilitadas" : "Retentativas automáticas desabilitadas"}</span>
            </CompanyField>
            <CompanyField label="Entregas pendentes"><span className="font-semibold tabular-nums">{count.format(queued)}</span></CompanyField>
            <CompanyField label="Verificação do destino">
              {webhook.verifiedAt ? <time dateTime={webhook.verifiedAt} className="tabular-nums">{formatDateTime(webhook.verifiedAt)}</time> : "Aguardando verificação"}
            </CompanyField>
          </dl>
          <div className="grid gap-2 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Eventos assinados</h3>
            <ul className="flex flex-wrap gap-2" aria-label="Eventos assinados">
              {webhook.events.map((event) => <li key={event}><Badge variant="outline">{webhookEvents[event].label}</Badge></li>)}
            </ul>
          </div>
        </div>
        {webhook.interruptedAt && (
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-5">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-warning">Fila interrompida em <time dateTime={webhook.interruptedAt} className="tabular-nums">{formatDateTime(webhook.interruptedAt)}</time></p>
              <p className="text-pretty text-sm text-muted-foreground">O titular retoma a fila em Integrações após corrigir o destino.</p>
            </div>
            {blockedDeliveryId && <Button type="button" variant="outline" className="h-11" aria-haspopup="dialog"
              onClick={(event) => openDelivery(blockedDeliveryId, event.currentTarget)}>Ver entrega</Button>}
          </div>
        )}
      </Card>
    </>
  );
}

function DeliveryIdentity({ delivery }: { delivery: Delivery }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-pretty font-medium">{webhookEvents[delivery.eventType].label}</p>
      <time dateTime={delivery.createdAt} className="block text-xs text-muted-foreground tabular-nums">{formatDateTime(delivery.createdAt)}</time>
      {delivery.previousDestination && <p className="text-xs text-muted-foreground">Destino anterior</p>}
    </div>
  );
}

function LastAttempt({ delivery }: { delivery: Delivery }) {
  if (!delivery.lastAttempt) return <span className="text-xs text-muted-foreground">Sem tentativas</span>;
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-pretty text-sm">{webhookAttemptMessage(delivery.lastAttempt)}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{count.format(delivery.attemptCount)} {delivery.attemptCount === 1 ? "tentativa" : "tentativas"}</p>
    </div>
  );
}

function OpenAttempt({ delivery, open }: { delivery: Delivery; open: OpenDelivery }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground"
      aria-haspopup="dialog"
      aria-label={`Ver tentativas de ${webhookEvents[delivery.eventType].label}, entrega ${delivery.id.slice(0, 8)}`}
      onClick={(event) => open(delivery.id, event.currentTarget)}>
      <ChevronRight aria-hidden="true" />
    </Button>
  );
}

function DeliveryRows({ items, open }: { items: Delivery[]; open: OpenDelivery }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table aria-label="Entregas do webhook" className="table-fixed">
          <colgroup><col className="w-2/5" /><col className="w-1/4" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Evento e horário</TableHead><TableHead scope="col">Situação</TableHead>
              <TableHead scope="col">Última tentativa</TableHead><TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="py-3 pl-5"><DeliveryIdentity delivery={delivery} /></TableCell>
              <TableCell className="py-3"><DeliveryStatus delivery={delivery} /></TableCell>
              <TableCell className="py-3"><LastAttempt delivery={delivery} /></TableCell>
              <TableCell className="px-2 py-2 text-right"><OpenAttempt delivery={delivery} open={open} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Entregas do webhook" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((delivery) => (
          <li key={delivery.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2"><DeliveryIdentity delivery={delivery} /><OpenAttempt delivery={delivery} open={open} /></div>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><LastAttempt delivery={delivery} /><DeliveryStatus delivery={delivery} /></div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminWebhookScreen({ user, webhookId }: { user: AdminIdentity; webhookId: string }) {
  const params = useSearchParams();
  const returnQuery = adminWebhookQueryFrom(params);
  const history = webhookHistoryQueryFrom(params);
  const selected = webhookIdSchema.safeParse(params.get("entrega")).data ?? null;
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const result = useQuery({
    queryKey: ["admin-webhook", user.id, webhookId, history.state, history.page],
    queryFn: ({ signal }) => adminWebhooks.history(webhookId, history, signal),
    placeholderData: (data, previous) => previous?.queryKey[1] === user.id && previous.queryKey[2] === webhookId ? data : undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const status = result.error instanceof ApiError ? result.error.status : undefined;
  const report = status && [401, 403, 404].includes(status) ? undefined : result.data;
  const listLoading = result.isLoading || result.isPlaceholderData;

  function navigate(next: WebhookHistoryQuery, deliveryId?: string | null) {
    window.history.replaceState(null, "", adminWebhookHref(returnQuery, webhookId, next, deliveryId));
  }

  function openDelivery(id: string, source: HTMLButtonElement) {
    opener.current = source;
    navigate({ ...history, page: report?.pagination.page ?? history.page }, id);
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    const source = opener.current;
    if (source?.isConnected && source.getClientRects().length && !source.closest("[inert]")) {
      source.focus();
    } else {
      heading.current?.focus();
    }
    opener.current = null;
  }

  return (
    <AdminPanel user={user}>
      <div className="grid min-w-0 gap-5">
        <Button asChild variant="ghost" className="-ml-2 h-11 w-fit">
          <Link href={adminWebhookHref(returnQuery)} prefetch={false}><ArrowLeft aria-hidden="true" /> Webhooks Globais</Link>
        </Button>
        <ToastNotice message={result.error?.message} />
        {result.isLoading && <span role="status" className="sr-only">Carregando webhook</span>}
        <SkeletonReveal flow revealed={!result.isLoading} skeleton={
          <div className="grid gap-5">
            <Skeleton className="h-7 w-56 max-w-full animate-none" />
            <Skeleton className="h-40 animate-none" />
            <Skeleton className="h-48 animate-none" />
          </div>
        }>
          {report ? (
            <div className="grid min-w-0 gap-5">
              <WebhookProfile history={report} openDelivery={openDelivery} />
              <Card className="min-w-0" aria-labelledby="webhook-history">
                <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                  <h2 ref={heading} tabIndex={-1} id="webhook-history" className="text-balance text-lg font-semibold">Histórico de entregas</h2>
                  <GlideSelect ariaLabel="Situação da entrega" size="lg" className="w-full sm:w-56" menuWidth={224}
                    options={stateOptions} value={history.state}
                    onChange={(state) => navigate({ state: adminDeliveryStateFilter.parse(state), page: 1 })} />
                </header>
                {listLoading && <span role="status" className="sr-only">Carregando entregas</span>}
                <SkeletonReveal flow revealed={!listLoading} skeleton={<WebhookRowsSkeleton rows={2} />}>
                  {report.items.length ? <DeliveryRows items={report.items} open={openDelivery} /> : (
                    <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
                      <h3 className="text-balance text-base font-semibold">{history.state !== "ALL" ? "Nenhuma entrega nesta situação" : "Nenhuma entrega registrada"}</h3>
                      {history.state === "ALL" ? (
                        <p className="max-w-sm text-pretty text-sm text-muted-foreground">Os envios dos eventos assinados deste destino aparecem aqui.</p>
                      ) : (
                        <Button type="button" variant="outline" className="h-11" onClick={() => navigate({ state: "ALL", page: 1 })}>Mostrar todas as entregas</Button>
                      )}
                    </div>
                  )}
                </SkeletonReveal>
                {report.pagination.total > 0 && <TablePagination {...report.pagination} busy={listLoading}
                  onPageChange={(page) => navigate({ ...history, page })} label="Paginação das entregas" />}
              </Card>
            </div>
          ) : result.isError && (status === 404 ? (
            <Card className="grid min-h-32 content-center px-5 py-6"><h1 className="text-balance text-xl font-semibold">Webhook não encontrado</h1></Card>
          ) : <CompanyReadError title="Consulta de entregas indisponível" retry={() => void result.refetch()} />)}
        </SkeletonReveal>
      </div>
      <AdminWebhookAttemptsDialog userId={user.id} webhookId={webhookId} deliveryId={selected}
        close={() => navigate(history)} restoreFocus={restoreFocus} />
    </AdminPanel>
  );
}
