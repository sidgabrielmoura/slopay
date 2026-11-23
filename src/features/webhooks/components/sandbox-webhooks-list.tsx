"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Ellipsis, Plus, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { IntegrationHeading } from "@/features/integrations/components/integration-heading";
import { webhookLogsPath } from "@/features/integrations/navigation";
import { sandboxWebhookGateway, sandboxWebhookKey } from "../sandbox-webhook-gateway";
import type { SandboxWebhook } from "../sandbox-webhooks";
import { newWebhookPath, webhookEvents, webhooksPath } from "../webhooks";
import { SandboxWebhookActionDialog, type WebhookReview } from "./sandbox-webhook-action-dialog";
import { SandboxWebhookBadge, SandboxWebhookFallback } from "./sandbox-webhook-state";
import styles from "./webhooks-table.module.css";

export function SandboxWebhooksList({ accountId }: { accountId: string }) {
  const development = useDevelopmentFeatures();
  const list = useQuery({
    queryKey: sandboxWebhookKey(accountId),
    queryFn: ({ signal }) => sandboxWebhookGateway.list(signal),
    retry: false,
  });
  const [review, setReview] = useState<WebhookReview | null>(null);
  const menu = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const openingConfirmation = useRef(false);

  function action(webhook: SandboxWebhook, kind: "pause" | "enable" | "resume" | "delete") {
    openingConfirmation.current = true;
    setReview({ name: webhook.name, action: { kind, id: webhook.id, version: webhook.version } });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada.");
    } catch {
      toast.error("Selecione a URL na lista para copiá-la.");
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading title="Webhooks" description="Gerencie os destinos que recebem os eventos Pix do Slopay."
        action={list.data?.connected && <Button asChild className="h-11 w-full sm:w-auto">
          <Link href={newWebhookPath}><Plus aria-hidden="true" data-icon="inline-start" /> Novo webhook</Link>
        </Button>} />

      {!list.data?.connected ? (
        <SandboxWebhookFallback development={development} pending={list.isPending} error={list.error} unlinked={list.data?.connected === false}
          retry={() => void list.refetch()} />
      ) : (
        <Card className="min-w-0">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
            <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">Destinos cadastrados</h2>
            <Button asChild variant="outline" className="h-10"><Link href={webhookLogsPath}>Ver entregas</Link></Button>
          </CardHeader>
          {!list.data.webhooks.length ? (
            <Empty icon={<Webhook aria-hidden="true" />} className="rounded-none border-0" title="Nenhum webhook cadastrado" />
          ) : (
            <div className={styles.tableRegion}>
              <table className={`${styles.table} w-full table-fixed text-left text-sm`}>
                <colgroup className={styles.columns}>
                  <col className="w-[36%]" /><col className="w-[30%]" /><col className="w-[25%]" /><col className="w-[9%]" />
                </colgroup>
                <thead className={`${styles.header} border-b text-xs text-muted-foreground`}>
                  <tr><th scope="col" className="p-4 font-medium">Destino</th><th scope="col" className="p-4 font-medium">Eventos</th>
                    <th scope="col" className="p-4 font-medium">Status</th><th scope="col"><span className="sr-only">Ações</span></th></tr>
                </thead>
                <tbody className={`${styles.body} divide-y divide-border`}>
                  {list.data.webhooks.map((webhook) => (
                    <tr key={webhook.id} className={styles.row}>
                      <td className={`${styles.fullWidth} p-4 align-middle`}>
                        <Link className="wrap-anywhere font-medium hover:underline" href={`${webhooksPath}/${webhook.id}`}>{webhook.name}</Link>
                        <span className="mt-1 block wrap-anywhere text-xs text-muted-foreground">{webhook.endpointUrl}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`${styles.mobileLabel} mb-1 text-xs text-muted-foreground`}>Eventos</span>
                        <p className="text-pretty">{webhook.eventTypes.map((event) => webhookEvents[event].label).join(" · ")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{webhook.deliveryMode === "SEQUENTIAL" ? "Sequencial" : "Não sequencial"}</p>
                      </td>
                      <td className="p-4 align-middle">
                        <span className={`${styles.mobileLabel} mb-1 text-xs text-muted-foreground`}>Status</span>
                        <SandboxWebhookBadge webhook={webhook} />
                      </td>
                      <td className={`${styles.fullWidth} ${styles.actions} p-1 pr-3 text-right align-middle`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="size-11"
                              aria-label={`Ações de ${webhook.name}`} onFocus={(event) => { menu.current = event.currentTarget; }}>
                              <Ellipsis aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onCloseAutoFocus={(event) => {
                            if (openingConfirmation.current) event.preventDefault();
                          }}>
                            <DropdownMenuItem asChild><Link href={`${webhooksPath}/${webhook.id}`}>{webhook.verifiedAt ? "Editar destino" : "Verificar destino"}</Link></DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`${webhookLogsPath}&destino=${webhook.id}`}>Ver entregas</Link></DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void copyUrl(webhook.endpointUrl)}>Copiar URL</DropdownMenuItem>
                            {webhook.verifiedAt && <DropdownMenuItem onSelect={() => action(webhook, webhook.enabled ? "pause" : "enable")}>
                              {webhook.enabled ? "Pausar" : "Habilitar"}
                            </DropdownMenuItem>}
                            {webhook.interruptedAt && <DropdownMenuItem onSelect={() => action(webhook, "resume")}>Reativar fila</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => action(webhook, "delete")}>Excluir webhook</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {review && <SandboxWebhookActionDialog accountId={accountId} review={review}
        onClose={() => { openingConfirmation.current = false; setReview(null); }}
        restoreFocus={() => (menu.current?.isConnected ? menu.current : heading.current)?.focus()} />}
    </div>
  );
}

