"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, RotateCw, Save, Webhook } from "lucide-react";
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
import { sandboxWebhookEvents, webhookNameLimit, webhookSettingsSchema, type SandboxWebhook } from "../sandbox-webhooks";
import { webhookDeliveryOptions, webhookEvents, webhooksPath } from "../webhooks";
import { SandboxWebhookActionDialog, type WebhookReview } from "./sandbox-webhook-action-dialog";
import { SandboxWebhookBadge, SandboxWebhookFallback } from "./sandbox-webhook-state";
import { WebhookEventsField } from "./webhook-events-field";

export function SandboxWebhookForm({ accountId, webhookId, canManage = true }: {
  accountId: string; webhookId?: string; canManage?: boolean;
}) {
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
    <div className="mx-auto grid w-full min-w-0 gap-5">
      <Button asChild variant="ghost" className="h-10 w-fit"><Link href={webhooksPath}>
        <ArrowLeft aria-hidden="true" data-icon="inline-start" /> Webhooks
      </Link></Button>
      <IntegrationHeading
        title={webhookId ? canManage ? "Configurar webhook" : "Webhook" : "Novo webhook"}
        description={webhookId ? canManage ? "Ajuste o destino HTTPS e os eventos que ele recebe." : "Consulte o destino HTTPS e os eventos que ele recebe."
          : "Escolha o destino HTTPS e os eventos que ele deve receber."}
        action={detail.data && <SandboxWebhookBadge webhook={detail.data} />}
      />
      {!canManage && detail.data ? (
        <Card className="grid min-w-0 gap-3 p-5">
          <h2 className="text-lg font-semibold">{detail.data.name}</h2>
          <p className="wrap-anywhere text-sm text-muted-foreground">{detail.data.endpointUrl}</p>
          <p className="text-pretty text-sm">{detail.data.eventTypes.map(event => webhookEvents[event].label).join(" · ")}</p>
          <Button asChild variant="outline" className="h-11 w-fit">
            <Link href={`${webhookLogsPath}&destino=${detail.data.id}`}>Ver entregas</Link>
          </Button>
        </Card>
      ) : ready ? <Editor accountId={accountId} webhook={detail.data} /> : (
        <SandboxWebhookFallback development={development} pending={reading.isPending} error={reading.error} unlinked={list.data?.connected === false}
          retry={() => void reading.refetch()} />
      )}
    </div>
  );
}

function Editor({ accountId, webhook }: { accountId: string; webhook?: SandboxWebhook }) {
  const router = useRouter();
  const query = useQueryClient();
  const [review, setReview] = useState<WebhookReview | null>(null);
  const control = useRef<HTMLElement | null>(null);
  const signingHeading = useRef<HTMLHeadingElement>(null);
  const verification = useMutation({
    mutationFn: () => sandboxWebhookGateway.verify(webhook!.id, webhook!.version),
    onSuccess: (verified) => {
      query.setQueryData(sandboxWebhookKey(accountId, verified.id), verified);
      void query.invalidateQueries({ queryKey: sandboxWebhooksKey(accountId) });
      toast.success("Destino verificado.");
    },
  });

  function restoreFocus() {
    (control.current?.isConnected ? control.current : signingHeading.current)?.focus();
  }

  return (
    <>
      {webhook && (!webhook.verifiedAt || verification.isSuccess) && (
        <Card className="grid gap-4 p-5">
          {verification.isSuccess && webhook.verifiedAt ? <div className="flex flex-wrap items-center gap-3">
            <LoadingConfirmation size={38} animate />
            <div><h2 className="text-base font-semibold">Destino verificado</h2>
              <p className="text-sm text-muted-foreground">{!webhook.enabled ? "Habilite as entregas para enviar os eventos da fila."
                : webhook.interruptedAt ? "Reative a fila para retomar as entregas." : "O destino pode receber os eventos selecionados."}</p></div>
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

      {webhook?.verifiedAt && (!webhook.enabled || webhook.interruptedAt) && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="grid min-w-0 gap-1">
            <h2 className="text-balance text-base font-semibold">{webhook.enabled ? "Fila interrompida" : "Entregas pausadas"}</h2>
            <p className="text-pretty text-sm text-muted-foreground">{webhook.enabled
              ? "Depois de ajustar o destino, retome pelo evento que parou a fila."
              : "Habilite o destino para continuar enviando os eventos registrados."}</p>
          </div>
          <Button type="button" variant="outline" className="h-11" onClick={(event) => {
            control.current = event.currentTarget;
            setReview({ action: { kind: webhook.enabled ? "resume" : "enable", id: webhook.id, version: webhook.version }, name: webhook.name });
          }}>{webhook.enabled ? "Reativar fila" : "Habilitar entregas"}</Button>
        </Card>
      )}

      <SettingsForm key={webhook ? webhook.id + "-" + webhook.version : "new"} webhook={webhook} onReview={(next, source) => {
        control.current = source;
        setReview(next);
      }} />

      {webhook && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="grid min-w-0 gap-1">
            <h2 ref={signingHeading} tabIndex={-1} className="text-balance text-base font-semibold">Assinatura das entregas</h2>
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
        onClose={() => setReview(null)} restoreFocus={restoreFocus}
        onComplete={(result) => {
          if (!webhook) router.replace(`${webhooksPath}/${result.webhook.id}`);
          else restoreFocus();
        }} />}
    </>
  );
}

const validationMessages = {
  name: "Informe um nome de até 50 caracteres.",
  endpointUrl: "Informe uma URL HTTPS válida na porta 443.",
  notificationEmail: "Informe um e-mail válido para os avisos.",
  authToken: "Use um token exclusivo de 32 a 255 caracteres, sem espaços.",
  eventTypes: "Selecione pelo menos um evento.",
} as const;
type SettingsField = keyof typeof validationMessages;

function SettingsForm({ webhook, onReview }: {
  webhook?: SandboxWebhook;
  onReview: (review: WebhookReview, trigger: HTMLElement | null) => void;
}) {
  const [events, setEvents] = useState<readonly WebhookEventType[]>(webhook?.eventTypes ?? []);
  const [invalid, setInvalid] = useState<SettingsField>();
  const [mode, setMode] = useState(webhook?.deliveryMode ?? "SEQUENTIAL");
  const [token, setToken] = useState("");
  const queueEditable = !webhook?.interruptedAt;
  const nameLength = Math.max(webhookNameLimit, webhook?.name.length ?? 0);

  function generateToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    setToken(Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join(""));
    setInvalid(undefined);
    toast.success("Token gerado.");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const settings = webhookSettingsSchema.safeParse({
      name,
      endpointUrl: form.get("endpointUrl"),
      eventTypes: events,
      deliveryMode: mode,
      retryEnabled: form.has("retryEnabled"),
      notificationEmail: String(form.get("notificationEmail") ?? "").trim() || null,
      authToken: token || undefined,
      queueEnabled: queueEditable ? form.has("queueEnabled") : undefined,
    });
    const nameTooLong = name.length > webhookNameLimit && name !== webhook?.name;
    if (!settings.success || nameTooLong) {
      const issue = nameTooLong ? "name" : settings.error?.issues[0]?.path[0];
      const field = typeof issue === "string" && Object.hasOwn(validationMessages, issue) ? issue as SettingsField : "eventTypes";
      setInvalid(field);
      if (field === "eventTypes") event.currentTarget.querySelector<HTMLElement>("#webhook-event")?.focus();
      else {
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
      <Card className="grid min-w-0 gap-5 p-4 sm:p-5">
        <h2 className="text-balance text-lg font-semibold">Destino e envio</h2>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <div className="grid min-w-0 content-start gap-1.5">
            <label htmlFor="sandbox-webhook-name" className="text-sm font-medium">Nome do webhook</label>
            <Input id="sandbox-webhook-name" name="name" className="h-11" placeholder="Ex. Conciliação do ERP"
              defaultValue={webhook?.name} maxLength={nameLength} required autoComplete="off"
              aria-describedby="sandbox-webhook-name-help" aria-invalid={invalid === "name" || undefined} onChange={() => setInvalid(undefined)} />
            <FieldHint id="sandbox-webhook-name-help" field="name" invalid={invalid}>Até 50 caracteres.</FieldHint>
          </div>
          <div className="grid min-w-0 content-start gap-1.5">
            <label htmlFor="sandbox-webhook-email" className="text-sm font-medium">E-mail para avisos</label>
            <Input id="sandbox-webhook-email" name="notificationEmail" type="email" className="h-11" placeholder="integracoes@empresa.com"
              defaultValue={webhook?.notificationEmail ?? ""} maxLength={254} autoComplete="off"
              aria-describedby="sandbox-webhook-email-help" aria-invalid={invalid === "notificationEmail" || undefined} onChange={() => setInvalid(undefined)} />
            <FieldHint id="sandbox-webhook-email-help" field="notificationEmail" invalid={invalid}>Opcional. Recebe um aviso quando uma entrega termina com falha.</FieldHint>
          </div>
          <div className="grid min-w-0 gap-1.5 md:col-span-2">
            <label htmlFor="sandbox-webhook-url" className="text-sm font-medium">URL HTTPS</label>
            <Input id="sandbox-webhook-url" name="endpointUrl" className="h-11" placeholder="https://api.empresa.com/webhooks/slopay"
              type="url" defaultValue={webhook?.endpointUrl} maxLength={2048} required autoComplete="off" spellCheck={false}
              aria-describedby={invalid === "endpointUrl" ? "sandbox-webhook-url-error" : undefined}
              aria-invalid={invalid === "endpointUrl" || undefined} onChange={() => setInvalid(undefined)} />
            {invalid === "endpointUrl" && <FieldHint id="sandbox-webhook-url-error" field="endpointUrl" invalid={invalid} />}
          </div>
          <div className="grid min-w-0 content-start gap-1.5">
            <label htmlFor="sandbox-webhook-token" className="text-sm font-medium">Token de autenticação</label>
            <div className="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap">
              <Input id="sandbox-webhook-token" name="authToken" type="password" className="h-11 min-w-0 flex-1" maxLength={255}
                autoComplete="new-password" placeholder={webhook ? "Informe um novo token" : "Digite ou gere um token"} value={token}
                aria-describedby="sandbox-webhook-token-help" aria-invalid={invalid === "authToken" || undefined}
                onChange={(event) => { setToken(event.currentTarget.value); setInvalid(undefined); }} />
              <Button type="button" variant="outline" className="h-11 shrink-0" onClick={generateToken}>
                <RotateCw aria-hidden="true" /> Gerar token
              </Button>
            </div>
            <FieldHint id="sandbox-webhook-token-help" field="authToken" invalid={invalid}>
              Opcional. Enviado no cabeçalho <code>webhook-token</code>{webhook ? ". Em branco, mantém o token atual." : "."}
            </FieldHint>
          </div>
          <div className="grid min-w-0 content-start gap-1.5">
            <label htmlFor="sandbox-webhook-mode" className="text-sm font-medium">Tipo de envio</label>
            <GlideSelect id="sandbox-webhook-mode" ariaLabel="Tipo de envio" options={webhookDeliveryOptions} value={mode}
              onChange={(value) => setMode(value === "PARALLEL" ? "PARALLEL" : "SEQUENTIAL")} size="lg" className="w-full" required />
            <p className="text-pretty text-xs text-muted-foreground">{mode === "SEQUENTIAL"
              ? "Envia na ordem dos eventos. A fila é interrompida em caso de falha definitiva."
              : "Envia em paralelo. Os eventos podem chegar fora de ordem."}</p>
          </div>
        </div>
        <div className="grid gap-2 border-t border-border pt-3">
          {queueEditable && <div className="grid min-w-0 gap-0.5">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium">
              <Checkbox name="queueEnabled" defaultChecked={webhook?.enabled ?? true} aria-describedby="sandbox-webhook-queue-help" />
              Fila de sincronização ativada
            </label>
            <p id="sandbox-webhook-queue-help" className="text-pretty text-xs text-muted-foreground">
              Com a fila pausada, os eventos ficam aguardando envio. As entregas começam após a verificação do destino.
            </p>
          </div>}
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
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

function FieldHint({ id, field, invalid, children }: {
  id: string; field: SettingsField; invalid?: SettingsField; children?: ReactNode;
}) {
  return invalid === field
    ? <p id={id} role="alert" className="text-xs text-destructive">{validationMessages[field]}</p>
    : <p id={id} className="text-pretty text-xs text-muted-foreground">{children}</p>;
}

