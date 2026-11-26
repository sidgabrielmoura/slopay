"use client";

import { Fragment, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Braces, ChevronRight, Clipboard, FileText, Pencil, Plus, RotateCcw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { webhookLogsPath } from "@/features/integrations/navigation";
import { cn } from "@/lib/utils";
import type { WebhookConfig, WebhookEventType } from "@/types/domain";
import { demoWebhookPayload, newWebhookPath, subscribedEvents, webhookEvents, webhooksPath, type WebhookWorkspace } from "../webhooks";
import styles from "./webhooks-table.module.css";

const eventOptions = [
  { value: "ALL", label: "Todos os eventos" },
  ...Object.entries(webhookEvents).map(([value, { label }]) => ({ value, label })),
];

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Não foi possível copiar para a área de transferência.");
  }
}

export function WebhooksListScreen({ service, queryKey, readOnly: isReadOnly }: WebhookWorkspace) {
  const queryClient = useQueryClient();
  const filterRef = useRef<HTMLButtonElement>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const [eventFilter, setEventFilter] = useState("ALL");
  const [target, setTarget] = useState<WebhookConfig | null>(null);
  const [preview, setPreview] = useState<{ webhook: WebhookConfig; event: WebhookEventType; payload: string } | null>(null);
  const endpoints = useQuery({
    queryKey,
    queryFn: () => service.getWebhooks(),
  });
  const visible = endpoints.data?.filter((item) => eventFilter === "ALL" || subscribedEvents(item).some((event) => event === eventFilter)) ?? [];

  const toggle = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Pick<Partial<WebhookConfig>, "active" | "queueInterrupted"> }) => service.updateWebhook(id, changes),
    onSuccess: async (item, { changes }) => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(changes.queueInterrupted === false ? "Fila reativada na simulação."
        : item.active ? "Webhook ativado na simulação." : "Webhook pausado na simulação.");
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!await service.deleteWebhook(id)) throw new Error("Webhook não encontrado.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading preview title="Webhooks" description="Configure os destinos HTTPS que recebem notificações de eventos do Slopay."
        action={(
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button asChild variant="outline" className="h-11 flex-1 sm:flex-none">
              <Link href={webhookLogsPath} prefetch={false}><FileText aria-hidden="true" /> Ver logs</Link>
            </Button>
            {!isReadOnly && (
              <Button asChild className="h-11 flex-1 sm:flex-none">
                <Link href={newWebhookPath} prefetch={false}><Plus aria-hidden="true" /> Novo webhook</Link>
              </Button>
            )}
          </div>
        )} />

      <Card className="min-w-0">
        <CardHeader className="gap-3 space-y-0 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="grid gap-1">
            <h2 className="text-balance text-lg font-semibold">Endpoints</h2>
            <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {endpoints.data && !endpoints.isError ? `${visible.length} ${visible.length === 1 ? "webhook" : "webhooks"}` : null}
            </p>
          </div>
          <FilterSheet value={{ event: eventFilter }} defaults={{ event: "ALL" }} active={eventFilter !== "ALL"} triggerRef={filterRef}
            onApply={draft => setEventFilter(draft.event)}>
            {(draft, setDraft) => <FilterSelect label="Evento" options={eventOptions} value={draft.event}
              onChange={event => setDraft({ event })} />}
          </FilterSheet>
        </CardHeader>
        <div className="border-t" aria-busy={endpoints.isFetching}>
          {endpoints.isError ? (
            <div className="grid justify-items-start gap-3 p-5">
              <OperationFailure message="Não foi possível carregar os webhooks." animate={false} />
              <Button type="button" variant="outline" className="h-11" onClick={() => void endpoints.refetch()}>Tentar novamente</Button>
            </div>
          ) : endpoints.isPending || visible.length ? (
            <div className={styles.tableRegion}>
              <Table role="table" aria-label="Webhooks cadastrados" className={cn(styles.table, "table-fixed")}>
                <colgroup className={styles.columns}>
                  <col />
                  <col className="w-36" />
                  <col className="w-40" />
                  <col className={isReadOnly ? "w-44" : "w-56"} />
                </colgroup>
                <TableHeader role="rowgroup" className={styles.header}>
                  <TableRow role="row" className="bg-background/40 hover:bg-background/40">
                    <TableHead role="columnheader" scope="col" className="h-10 sm:pl-5">Endpoint</TableHead>
                    <TableHead role="columnheader" scope="col" className="h-10 px-3">Status</TableHead>
                    <TableHead role="columnheader" scope="col" className="h-10 px-3">Fila</TableHead>
                    <TableHead role="columnheader" scope="col" className="h-10 pr-5 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody role="rowgroup" className={styles.body}>
                  {endpoints.isPending ? Array.from({ length: 4 }, (_, index) => (
                    <TableRow key={index} role="row" aria-hidden="true" className={cn(styles.row, "hover:bg-transparent")}>
                      <TableCell role="cell" className={cn(styles.fullWidth, "space-y-2 py-4 sm:pl-5")}>
                        <Skeleton className="h-4 w-32 max-w-full" />
                        <Skeleton className="h-3 w-64 max-w-full" />
                        <Skeleton className="h-3 w-48 max-w-full" />
                      </TableCell>
                      <TableCell role="cell" className="px-3"><Skeleton className="h-5 w-24 max-w-full" /></TableCell>
                      <TableCell role="cell" className="px-3"><Skeleton className="h-5 w-20 max-w-full" /></TableCell>
                      <TableCell role="cell" className={cn(styles.fullWidth, styles.actions, "pr-5")}>
                        <Skeleton className="ml-auto h-9 w-32 max-w-full" />
                      </TableCell>
                    </TableRow>
                  )) : visible.map((item) => {
                    const events = subscribedEvents(item);
                    const title = item.name || webhookEvents[item.eventType].label;
                    const label = isReadOnly ? "Ver" : "Editar";
                    const changes = toggle.isPending && toggle.variables?.id === item.id ? toggle.variables.changes : undefined;
                    const resumingQueue = changes?.queueInterrupted === false;
                    const interrupted = item.active && item.queueInterrupted;
                    return (
                      <Fragment key={item.id}>
                        <TableRow role="row" className={cn(styles.row, "hover:bg-transparent")}>
                          <TableCell role="cell" className={cn(styles.fullWidth, "py-3 sm:pl-5")}>
                            <h3 className="text-balance wrap-anywhere text-sm font-semibold">{title}</h3>
                            <p className="mt-1 line-clamp-2 wrap-anywhere font-mono text-xs text-muted-foreground" title={item.url}>{item.url}</p>
                            {(item.name || events.length > 1) && (
                              <p className="mt-1 text-pretty text-xs text-muted-foreground">{events.map((event) => webhookEvents[event].label).join(" · ")}</p>
                            )}
                            <p className="mt-1 text-pretty text-xs text-muted-foreground">{item.deliveryMode === "PARALLEL" ? "Envio não sequencial" : "Envio sequencial"} · {item.retryEnabled ? "Com retentativas" : "Sem retentativas"}</p>
                          </TableCell>
                          <TableCell role="cell" className="px-3 py-3">
                            <span aria-hidden="true" className={cn(styles.mobileLabel, "mb-1 text-xs font-medium text-muted-foreground")}>Status</span>
                            {isReadOnly ? (
                              <Badge variant={item.active ? "success" : "secondary"}>{item.active ? "Ativo" : "Pausado"}</Badge>
                            ) : (
                              <label className="flex min-h-11 w-fit max-w-full items-center gap-2 text-sm">
                                <Switch checked={item.active} disabled={toggle.isPending} aria-label={`Webhook ativo · ${title}`}
                                  onCheckedChange={(active) => toggle.mutate({ id: item.id, changes: { active } })} />
                                <span className="min-w-0 wrap-anywhere">{changes?.active !== undefined ? "Salvando…" : item.active ? "Ativo" : "Pausado"}</span>
                              </label>
                            )}
                          </TableCell>
                          <TableCell role="cell" className="px-3 py-3">
                            <span aria-hidden="true" className={cn(styles.mobileLabel, "mb-1 text-xs font-medium text-muted-foreground")}>Fila</span>
                            {interrupted ? (
                              <div className="flex flex-col items-start">
                                <Badge variant="warning">Interrompida</Badge>
                                {!isReadOnly && (
                                  <Button type="button" variant="ghost" size="sm" className="min-h-11 max-w-full whitespace-normal px-2 text-left" disabled={toggle.isPending}
                                    onClick={() => toggle.mutate({ id: item.id, changes: { queueInterrupted: false } })}>
                                    <RotateCcw aria-hidden="true" /> {resumingQueue ? "Reativando…" : "Reativar fila"}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <p className="flex min-h-11 items-center text-sm text-muted-foreground">{item.active ? "Normal" : "Inativa"}</p>
                            )}
                          </TableCell>
                          <TableCell role="cell" className={cn(styles.fullWidth, styles.actions, "py-2 pr-5 pl-3")}>
                            <div className="flex flex-wrap items-center justify-end">
                              <span aria-hidden="true" className={cn(styles.mobileLabel, "mr-auto text-xs font-medium text-muted-foreground")}>Ações</span>
                              <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground" title="Copiar URL"
                                aria-label={`Copiar URL · ${title}`} onClick={() => void copyText(item.url, "URL copiada.")}>
                                <Clipboard aria-hidden="true" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground" title="Prévia do evento"
                                aria-label={`Prévia do evento · ${title}`} onClick={(click) => {
                                  previewTrigger.current = click.currentTarget;
                                  const event = events.find((type) => type === eventFilter) ?? events[0];
                                  setPreview({ webhook: item, event, payload: demoWebhookPayload(event) });
                                }}>
                                <Braces aria-hidden="true" />
                              </Button>
                              <Button asChild variant="ghost" size="icon" className="size-11 text-muted-foreground">
                                <Link href={`${webhooksPath}/${encodeURIComponent(item.id)}`} prefetch={false} title={`${label} webhook`} aria-label={`${label} webhook · ${title}`}>
                                  {isReadOnly ? <ChevronRight aria-hidden="true" /> : <Pencil aria-hidden="true" />}
                                </Link>
                              </Button>
                              {!isReadOnly && (
                                <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" title="Excluir webhook"
                                  aria-label={`Excluir webhook · ${title}`} disabled={toggle.isPending} onClick={(click) => {
                                    removeTrigger.current = click.currentTarget;
                                    remove.reset();
                                    setTarget(item);
                                  }}>
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {toggle.isError && toggle.variables?.id === item.id && (
                          <TableRow role="row" className={cn(styles.row, "hover:bg-transparent")}>
                            <TableCell role="cell" colSpan={4} className={styles.fullWidth}>
                              <OperationFailure message={toggle.error.message} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty icon={<Webhook aria-hidden="true" />} className="rounded-none border-0"
              title={eventFilter === "ALL" ? "Nenhum webhook cadastrado" : "Nenhum webhook para este evento"}
              action={eventFilter !== "ALL" ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => { setEventFilter("ALL"); filterRef.current?.focus(); }}>
                  Ver todos os eventos
                </Button>
              ) : !isReadOnly ? <Button asChild className="h-11"><Link href={newWebhookPath} prefetch={false}>Criar webhook</Link></Button> : undefined} />
          )}
        </div>
      </Card>

      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={(event) => { event.preventDefault(); previewTrigger.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle className="text-balance">Prévia do evento</DialogTitle>
            <DialogDescription className="text-pretty">Exemplo de notificação em JSON.</DialogDescription>
          </DialogHeader>
          <p className="min-w-0 wrap-anywhere font-mono text-xs text-muted-foreground">{preview?.webhook.url}</p>
          {preview && subscribedEvents(preview.webhook).length > 1 && (
            <GlideSelect ariaLabel="Evento da prévia" size="lg" className="w-full sm:w-56"
              options={subscribedEvents(preview.webhook).map((value) => ({ value, label: webhookEvents[value].label }))}
              value={preview.event} onChange={(value) => {
                const event = subscribedEvents(preview.webhook).find((type) => type === value);
                if (event) setPreview({ webhook: preview.webhook, event, payload: demoWebhookPayload(event) });
              }} />
          )}
          <pre className="min-w-0 whitespace-pre-wrap wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs">
            <code>{preview?.payload}</code>
          </pre>
          <Button type="button" variant="outline" className="h-11 justify-self-end" onClick={() => {
            if (preview) void copyText(preview.payload, "JSON copiado.");
          }}><Clipboard aria-hidden="true" /> Copiar JSON</Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !remove.isPending) setTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md"
          onEscapeKeyDown={(event) => { if (remove.isPending) event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = removeTrigger.current;
            if (trigger?.isConnected) trigger.focus();
            else filterRef.current?.focus();
          }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance">{remove.isSuccess ? "Webhook excluído" : "Excluir webhook?"}</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere text-pretty">
              {remove.isSuccess ? "O endereço foi removido da demonstração." : `O endereço ${target?.url} será removido da demonstração.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.isSuccess && <div className="justify-self-center"><LoadingConfirmation animate /></div>}
          {remove.isError && <OperationFailure message={remove.error.message} />}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={remove.isPending}>{remove.isSuccess ? "Fechar" : "Cancelar"}</AlertDialogCancel>
            {!remove.isSuccess && (
              <Button type="button" variant="destructive" className="h-11" disabled={remove.isPending || isReadOnly}
                onClick={() => { if (target) remove.mutate(target.id); }}>
                {remove.isPending && <LoadingIndicator />}
                {remove.isPending ? "Excluindo…" : "Excluir webhook"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
