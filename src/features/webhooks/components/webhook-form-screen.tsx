"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import type { WebhookConfig, WebhookEventType } from "@/types/domain";
import { subscribedEvents, webhookDeliveryOptions, webhookError, webhooksPath, type WebhookValues, type WebhookWorkspace } from "../webhooks";
import { WebhookEventsField } from "./webhook-events-field";

const initialHeaders = [{ key: "Content-Type", value: "application/json" }];
const requiredEventToastId = "webhook-event-required";

function BackToWebhooks() {
  return (
    <Button asChild variant="ghost" className="h-11 justify-self-start">
      <Link href={webhooksPath} prefetch={false}><ArrowLeft aria-hidden="true" /> Voltar aos webhooks</Link>
    </Button>
  );
}

export function WebhookFormScreen({ webhookId, service, queryKey, readOnly }: { webhookId?: string } & WebhookWorkspace) {
  const endpoints = useQuery({
    queryKey,
    queryFn: () => service.getWebhooks(),
    enabled: Boolean(webhookId),
  });
  const webhook = webhookId ? endpoints.data?.find((item) => item.id === webhookId) : undefined;

  if (webhookId && endpoints.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando webhook" className="grid max-w-4xl gap-5">
        <BackToWebhooks />
        <Skeleton className="h-8 w-52 max-w-full" />
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </Card>
      </div>
    );
  }
  if (webhookId && endpoints.isError) {
    return (
      <div className="grid max-w-4xl justify-items-start gap-4">
        <BackToWebhooks />
        <OperationFailure message="Não foi possível carregar o webhook." animate={false} />
        <Button type="button" variant="outline" className="h-11" onClick={() => void endpoints.refetch()}>Tentar novamente</Button>
      </div>
    );
  }
  if ((webhookId && !webhook) || (!webhookId && readOnly)) {
    return <Empty icon={<Webhook aria-hidden="true" />}
      title={webhookId ? "Webhook não encontrado" : "Perfil de consulta"}
      description={webhookId ? undefined : "Seu perfil permite consultar os webhooks existentes."}
      action={<BackToWebhooks />} />;
  }

  return <WebhookForm key={webhookId ?? "novo"} webhook={webhook} service={service} queryKey={queryKey} readOnly={readOnly} />;
}

function WebhookForm({ webhook, service, queryKey, readOnly }: { webhook?: WebhookConfig } & WebhookWorkspace) {
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<WebhookEventType[]>(() => webhook ? subscribedEvents(webhook) : ["PIX_RECEIVED"]);
  const [url, setUrl] = useState(webhook?.url ?? "");
  const [deliveryMode, setDeliveryMode] = useState(webhook?.deliveryMode ?? "SEQUENTIAL");
  const [retryEnabled, setRetryEnabled] = useState(webhook?.retryEnabled ?? true);
  const [active, setActive] = useState(webhook?.active ?? true);
  const [headers, setHeaders] = useState(() => (webhook?.headers ?? initialHeaders).map((header, id) => ({ ...header, id })));
  const nextHeaderId = useRef(headers.length);
  const addHeaderButton = useRef<HTMLButtonElement>(null);
  const [invalid, setInvalid] = useState<"event" | "url" | "headers">();
  const save = useMutation({
    mutationFn: (values: WebhookValues) => webhook
      ? service.updateWebhook(webhook.id, values)
      : service.createWebhook(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const locked = readOnly || save.isPending;

  function clearError() {
    setInvalid(undefined);
    if (save.isError) save.reset();
  }

  function updateHeader(id: number, field: "key" | "value", text: string) {
    setHeaders((current) => current.map((header) => header.id === id ? { ...header, [field]: text } : header));
    clearError();
  }

  function changeEvents(next: readonly WebhookEventType[], checked: boolean) {
    setEvents((current) => checked
      ? [...new Set([...current, ...next])]
      : current.filter((event) => !next.includes(event)));
    if (checked && invalid === "event") toast.dismiss(requiredEventToastId);
    clearError();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || save.isSuccess) return;
    if (!events.length) {
      setInvalid("event");
      toast.error("Selecione pelo menos um evento.", { id: requiredEventToastId });
      event.currentTarget.querySelector<HTMLInputElement>("#webhook-event input")?.focus();
      return;
    }
    const form = new FormData(event.currentTarget);
    const hasAuthToken = Boolean(String(form.get("token") ?? "").trim()) || Boolean(webhook?.hasAuthToken && !form.has("removeToken"));
    const values = {
      eventType: events[0], eventTypes: events, url: url.trim(), active, retryEnabled, deliveryMode, hasAuthToken,
      name: String(form.get("name") ?? "").trim() || undefined,
      notificationEmail: String(form.get("notificationEmail") ?? "").trim() || undefined,
      headers: headers.map(({ key, value }) => ({ key: key.trim(), value: value.trim() }))
        .filter((header) => header.key || header.value),
    };
    const issue = webhookError(values);
    if (issue) {
      setInvalid(issue.field);
      toast.error(issue.message);
      event.currentTarget.querySelector<HTMLElement>(`#webhook-${issue.field}`)?.focus();
      return;
    }
    save.mutate(values);
  }

  return (
    <div className="grid min-w-0 max-w-4xl mx-auto gap-5">
      <BackToWebhooks />
      <IntegrationHeading preview title={webhook ? readOnly ? "Webhook" : "Editar webhook" : "Novo webhook"}
        description={readOnly ? "Consulte o destino e os eventos associados a este webhook." : "Defina onde sua aplicação recebe os eventos e quais notificações deseja acompanhar."} />
      {save.isSuccess ? (
        <Card className="grid justify-items-center gap-3 p-6 text-center" role="status">
          <LoadingConfirmation animate />
          <h2 className="text-balance text-lg font-semibold">{webhook ? "Alterações salvas" : "Webhook cadastrado"}</h2>
          <p className="max-w-full wrap-anywhere text-pretty text-sm text-muted-foreground">{save.data.url}</p>
          <Button asChild className="h-11">
            <Link href={webhooksPath} prefetch={false} ref={(node) => { node?.focus({ preventScroll: true }); }}>Ver webhooks</Link>
          </Button>
        </Card>
      ) : (
        <form className="grid min-w-0 gap-4" onSubmit={submit}>
          <fieldset disabled={locked} className="min-w-0">
            <Card className="min-w-0">
              <CardHeader className="space-y-0 p-5">
                <h2 className="text-balance text-lg font-semibold">Destino e entrega</h2>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-4 px-5 pb-5">
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="webhook-name" className="text-sm font-medium">Nome <span className="text-muted-foreground">(opcional)</span></label>
                  <Input id="webhook-name" name="name" autoComplete="off" maxLength={80} defaultValue={webhook?.name}
                    className="h-11" placeholder="Ex. Conciliação Pix" />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="webhook-url" className="text-sm font-medium">URL de destino</label>
                  <Input id="webhook-url" type="url" required spellCheck={false} autoComplete="off"
                    value={url} placeholder="https://api.suaempresa.com.br/webhooks/slopay"
                    className="h-11 font-mono text-xs aria-invalid:border-destructive!" aria-invalid={invalid === "url" || undefined}
                    onChange={(event) => { setUrl(event.target.value); clearError(); }} />
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <div className="grid min-w-0 gap-1.5">
                    <label htmlFor="webhook-alert-email" className="text-sm font-medium">E-mail de alertas <span className="text-muted-foreground">(opcional)</span></label>
                    <Input id="webhook-alert-email" name="notificationEmail" type="email" autoComplete="off" defaultValue={webhook?.notificationEmail}
                      className="h-11" placeholder="integracoes@example.com" />
                  </div>
                  <div className="grid min-w-0 gap-1.5">
                    <label htmlFor="webhook-delivery" className="text-sm font-medium">Modo de envio</label>
                    <GlideSelect id="webhook-delivery" options={webhookDeliveryOptions} value={deliveryMode} size="lg" className="w-full"
                      disabled={locked} onChange={(value) => { setDeliveryMode(value === "PARALLEL" ? "PARALLEL" : "SEQUENTIAL"); clearError(); }} />
                  </div>
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="webhook-token" className="text-sm font-medium">Token de exemplo <span className="text-muted-foreground">(opcional)</span></label>
                  <Input id="webhook-token" name="token" type="password" autoComplete="new-password" className="h-11"
                    placeholder={webhook?.hasAuthToken ? "Token de exemplo configurado" : undefined} />
                  {webhook?.hasAuthToken && !readOnly && (
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox name="removeToken" />
                      Remover token de exemplo atual
                    </label>
                  )}
                </div>
                <div className="divide-y divide-border border-y">
                  <label className="flex min-h-12 items-center justify-between gap-3 text-sm font-medium">
                    Webhook ativo
                    <Switch checked={active} disabled={locked} onCheckedChange={(value) => { setActive(value); clearError(); }} />
                  </label>
                  <label className="flex min-h-12 items-center justify-between gap-3 text-sm font-medium">
                    Retentativas automáticas
                    <Switch checked={retryEnabled} disabled={locked} onCheckedChange={(value) => { setRetryEnabled(value); clearError(); }} />
                  </label>
                </div>
              </CardContent>
            </Card>
          </fieldset>

          <WebhookEventsField events={events} disabled={locked} invalid={invalid === "event"} onChange={changeEvents} />

          <fieldset disabled={locked} className="min-w-0">
            <Card className="min-w-0">
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-5">
                <div className="grid gap-1">
                  <h2 className="text-balance text-lg font-semibold">Cabeçalhos HTTP</h2>
                  {!readOnly && <p className="text-pretty text-xs text-muted-foreground">Use valores fictícios para testar a configuração.</p>}
                </div>
                {!readOnly && (
                  <Button ref={addHeaderButton} type="button" variant="outline" className="h-11" onClick={() => {
                    const id = nextHeaderId.current++;
                    setHeaders((current) => [...current, { key: "", value: "", id }]);
                    clearError();
                  }}><Plus aria-hidden="true" /> Adicionar cabeçalho</Button>
                )}
              </CardHeader>
              <CardContent id="webhook-headers" tabIndex={-1} aria-invalid={invalid === "headers" || undefined}
                className="grid min-w-0 gap-3 px-5 pb-5">
                {headers.map((header, index) => (
                  <div key={header.id} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <div className="grid min-w-0 gap-1.5">
                      <label htmlFor={`header-name-${header.id}`} className="text-xs font-medium">Nome</label>
                      <Input id={`header-name-${header.id}`} aria-label={`Nome do cabeçalho ${index + 1}`} className="h-11 font-mono text-xs"
                        spellCheck={false} value={header.key} placeholder="Content-Type"
                        onChange={(event) => updateHeader(header.id, "key", event.currentTarget.value)} />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                      <label htmlFor={`header-value-${header.id}`} className="text-xs font-medium">Valor</label>
                      <Input id={`header-value-${header.id}`} aria-label={`Valor do cabeçalho ${index + 1}`} className="h-11 font-mono text-xs"
                        spellCheck={false} autoComplete="off" value={readOnly && header.value ? "••••••" : header.value} placeholder="application/json"
                        onChange={(event) => updateHeader(header.id, "value", event.currentTarget.value)} />
                    </div>
                    {!readOnly && (
                      <Button type="button" variant="ghost" size="icon" className="size-11 justify-self-end text-muted-foreground hover:text-destructive"
                        aria-label={`Remover cabeçalho ${index + 1}`}
                        onClick={() => {
                          setHeaders((current) => current.filter((item) => item.id !== header.id));
                          clearError();
                          addHeaderButton.current?.focus();
                        }}><Trash2 aria-hidden="true" /></Button>
                    )}
                  </div>
                ))}
                {headers.length === 0 && <p className="text-pretty text-sm text-muted-foreground">Nenhum cabeçalho configurado.</p>}
              </CardContent>
            </Card>
          </fieldset>
          {save.isError && <OperationFailure message={save.error.message} />}
          {!readOnly && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="outline" className="h-11"><Link href={webhooksPath} prefetch={false}>Cancelar</Link></Button>
              <Button type="submit" disabled={save.isPending} className="h-11">
                {save.isPending ? <LoadingIndicator /> : <Save aria-hidden="true" />}
                {save.isPending ? "Salvando…" : webhook ? "Salvar alterações" : "Criar webhook"}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
