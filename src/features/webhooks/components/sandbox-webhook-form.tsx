"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Save, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { webhookLogsPath } from "@/features/integrations/navigation";
import type { WebhookEventType } from "@/types/domain";
import { sandboxWebhookGateway, sandboxWebhookKey, sandboxWebhooksKey } from "../sandbox-webhook-gateway";
import { sandboxWebhookEvents, webhookSettingsSchema, type SandboxWebhook } from "../sandbox-webhooks";
import { webhookDeliveryOptions, webhooksPath } from "../webhooks";
import { SandboxWebhookActionDialog, type WebhookReview } from "./sandbox-webhook-action-dialog";
import { SandboxWebhookBadge, SandboxWebhookFallback } from "./sandbox-webhook-state";
import { WebhookEventsField } from "./webhook-events-field";

export function SandboxWebhookForm({ accountId, webhookId }: { accountId: string; webhookId?: string }) {
  const development = useDevelopmentFeatures();
  const list = useQuery({
    queryKey: sandboxWebhookKey(accountId),
    queryFn: ({ signal }) => sandboxWebhookGateway.list(signal),
    enabled: !webhookId, retry: false,
  });
  const detail = useQuery({
    queryKey: sandboxWebhookKey(accountId, webhookId ?? "new"),
    queryFn: ({ signal }) => sandboxWebhookGateway.get(webhookId!, signal),
    enabled: Boolean(webhookId), retry: false,
  });
  const reading = webhookId ? detail : list;
  const ready = webhookId ? Boolean(detail.data) : list.data?.connected === true;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-4xl gap-5">
      <Button asChild variant="ghost" className="h-10 w-fit"><Link href={webhooksPath}>
        <ArrowLeft aria-hidden="true" data-icon="inline-start" /> Webhooks
      </Link></Button>
      <IntegrationHeading
        title={webhookId ? "Configurar webhook" : "Novo webhook"}
        description={webhookId ? "Ajuste o destino HTTPS e os eventos que ele recebe." : "Escolha o destino HTTPS e os eventos que ele deve receber."}
        action={detail.data && <SandboxWebhookBadge webhook={detail.data} />}
      />
      {ready ? <Editor accountId={accountId} webhook={detail.data} development={development} /> : (
        <SandboxWebhookFallback development={development} pending={reading.isPending} error={reading.error} unlinked={list.data?.connected === false}
          retry={() => void reading.refetch()} />
      )}
    </div>
  );
}

function Editor({ accountId, webhook, development }: { accountId: string; webhook?: SandboxWebhook; development: boolean }) {
  const router = useRouter();
  const query = useQueryClient();
  const [review, setReview] = useState<WebhookReview | null>(null);
  const control = useRef<HTMLElement | null>(null);
  const verification = useMutation({
    mutationFn: () => sandboxWebhookGateway.verify(webhook!.id, webhook!.version),
    onSuccess: (verified) => {
      query.setQueryData(sandboxWebhookKey(accountId, verified.id), verified);
      void query.invalidateQueries({ queryKey: sandboxWebhooksKey(accountId) });
      toast.success("Destino verificado.");
    },
  });

  return (
    <>
      {webhook && (!webhook.verifiedAt || verification.isSuccess) && (
        <Card className="grid gap-4 p-5">
          {verification.isSuccess && webhook.verifiedAt ? <div className="flex flex-wrap items-center gap-3">
            <LoadingConfirmation size={38} animate />
            <div><h2 className="text-base font-semibold">Destino verificado</h2>
              <p className="text-sm text-muted-foreground">Os próximos eventos selecionados entram na fila.</p></div>
          </div> : (
            <>
              <div className="grid gap-1">
                <h2 className="text-lg font-semibold">Verificar destino</h2>
                <p className="text-pretty text-sm text-muted-foreground">
                  Configure o segredo no servidor. Ao receber <code>WEBHOOK_VERIFICATION</code>, valide a assinatura e retorne HTTP 2xx
                  com o valor de <code>data.challenge</code> no campo <code>challenge</code> do JSON.
                </p>
              </div>
              <Button type="button" variant="outline" className="h-11 justify-self-start" disabled={verification.isPending}
                onClick={() => verification.mutate()}>
                {verification.isPending ? <LoadingIndicator size={18} /> : <Webhook aria-hidden="true" />}
                {verification.isPending ? "Verificando…" : "Verificar destino"}
              </Button>
              {verification.error && <OperationFailure key={verification.submittedAt} message={verification.error.message} />}
            </>
          )}
        </Card>
      )}

      <SettingsForm key={webhook ? webhook.id + "-" + webhook.version : "new"} webhook={webhook} development={development} onReview={(next, source) => {
        control.current = source;
        setReview(next);
      }} />

      {webhook && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="grid min-w-0 gap-1">
            <h2 className="text-base font-semibold">Assinatura das entregas</h2>
            <p className="text-pretty text-sm text-muted-foreground">Use o segredo do destino para validar cada evento recebido.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11"><Link href={`${webhookLogsPath}&destino=${webhook.id}`}>Ver entregas</Link></Button>
            <Button type="button" variant="outline" className="h-11" onClick={(event) => {
              control.current = event.currentTarget;
              setReview({ action: { kind: "rotate-secret", id: webhook.id, version: webhook.version }, name: webhook.name });
            }}><KeyRound aria-hidden="true" data-icon="inline-start" /> Trocar segredo</Button>
          </div>
        </Card>
      )}

      {review && <SandboxWebhookActionDialog accountId={accountId} review={review}
        onClose={() => setReview(null)} restoreFocus={() => control.current?.focus()}
        onComplete={(result) => {
          if (!webhook) router.replace(`${webhooksPath}/${result.webhook.id}`);
          else control.current?.focus();
        }} />}
    </>
  );
}

function SettingsForm({ webhook, onReview, development }: {
  webhook?: SandboxWebhook;
  development: boolean;
  onReview: (review: WebhookReview, trigger: HTMLElement | null) => void;
}) {
  const [events, setEvents] = useState<readonly WebhookEventType[]>(webhook?.eventTypes ?? []);
  const [invalid, setInvalid] = useState<"name" | "endpointUrl" | "eventTypes">();
  const [mode, setMode] = useState(webhook?.deliveryMode ?? "SEQUENTIAL");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const settings = webhookSettingsSchema.safeParse({
      name: form.get("name"),
      endpointUrl: form.get("endpointUrl"),
      eventTypes: events,
      deliveryMode: development ? mode : "SEQUENTIAL",
      retryEnabled: form.has("retryEnabled"),
    });
    if (!settings.success) {
      const field = settings.error.issues[0]?.path[0];
      if (field === "name" || field === "endpointUrl" || field === "eventTypes") setInvalid(field);
      const validation = field === "name" ? "Informe um nome para o webhook."
        : field === "endpointUrl" ? "Informe uma URL HTTPS válida na porta 443."
          : "Selecione pelo menos um evento.";
      toast.error(validation);
      if (field === "eventTypes") event.currentTarget.querySelector<HTMLElement>("#webhook-event")?.focus();
      else if (field === "name" || field === "endpointUrl") {
        const input = event.currentTarget.elements.namedItem(field);
        if (input instanceof HTMLElement) input.focus();
      }
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    onReview({
      name: settings.data.name,
      action: webhook ? { kind: "update", id: webhook.id, version: webhook.version, settings: settings.data }
        : { kind: "create", settings: settings.data },
    }, submitter instanceof HTMLElement ? submitter : null);
  }

  return (
    <form className="grid min-w-0 gap-4" onSubmit={handleSubmit} noValidate>
      <Card className="grid min-w-0 gap-4 p-5">
        <h2 className="text-lg font-semibold">Destino e envio</h2>
        <div className="grid gap-1.5">
          <label htmlFor="sandbox-webhook-name" className="text-sm font-medium">Nome</label>
          <Input id="sandbox-webhook-name" name="name" className="h-11" placeholder="Ex. Conciliação do ERP"
            defaultValue={webhook?.name} maxLength={80} required autoComplete="off"
            aria-invalid={invalid === "name" || undefined} onChange={() => setInvalid(undefined)} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="sandbox-webhook-url" className="text-sm font-medium">URL HTTPS</label>
          <Input id="sandbox-webhook-url" name="endpointUrl" className="h-11" placeholder="https://api.empresa.com/webhooks/slopay"
            type="url" defaultValue={webhook?.endpointUrl} maxLength={2048} required autoComplete="off" spellCheck={false}
            aria-invalid={invalid === "endpointUrl" || undefined} onChange={() => setInvalid(undefined)} />
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          {development ? <div className="grid min-w-0 gap-1.5">
            <label htmlFor="sandbox-webhook-mode" className="text-sm font-medium">Modo de entrega</label>
            <GlideSelect id="sandbox-webhook-mode" ariaLabel="Modo de entrega" options={webhookDeliveryOptions} value={mode}
              onChange={(value) => setMode(value === "PARALLEL" ? "PARALLEL" : "SEQUENTIAL")} size="lg" className="w-full" />
          </div> : <div className="grid gap-1.5"><p className="text-sm font-medium">Modo de entrega</p>
            <p className="text-sm text-muted-foreground">Sequencial. A fila pausa quando uma entrega esgota as tentativas.</p>
          </div>}
          <label className="flex min-h-11 items-center gap-2.5 text-sm">
            <Checkbox name="retryEnabled" defaultChecked={webhook?.retryEnabled ?? true} /> Fazer retentativas automáticas
          </label>
        </div>
      </Card>

      <WebhookEventsField events={events} availableEvents={sandboxWebhookEvents} disabled={false} invalid={invalid === "eventTypes"}
        onChange={(types, checked) => {
          setInvalid(undefined);
          setEvents((current) => checked ? [...new Set([...current, ...types])] : current.filter((type) => !types.includes(type)));
        }} />

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="outline" className="h-11"><Link href={webhooksPath}>Cancelar</Link></Button>
        <Button type="submit" className="h-11"><Save aria-hidden="true" data-icon="inline-start" />
          {webhook ? "Salvar alterações" : "Criar webhook"}
        </Button>
      </div>
    </form>
  );
}

