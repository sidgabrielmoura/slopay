"use client";

import React, { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Webhook,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { WebhookConfig } from "@/types/domain";

interface WebhookFormScreenProps {
  webhookId?: string;
}

export function WebhookFormScreen({ webhookId }: WebhookFormScreenProps) {
  const router = useRouter();
  const service = useGatewayService();
  const queryClient = useQueryClient();
  const isEditing = Boolean(webhookId);

  const [eventType, setEventType] = useState<WebhookConfig["eventType"]>("PIX_RECEIVED");
  const [url, setUrl] = useState("");
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [active, setActive] = useState(true);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: "Content-Type", value: "application/json" },
  ]);

  const { data: existingWebhook, isLoading: isLoadingExisting } = useQuery({
    queryKey: queryKeys.webhooks(),
    queryFn: () => service.getWebhooks(),
    select: (list) => list.find((w) => w.id === webhookId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingWebhook) {
      setEventType(existingWebhook.eventType);
      setUrl(existingWebhook.url);
      setRetryEnabled(existingWebhook.retryEnabled);
      setActive(existingWebhook.active);
      if (existingWebhook.headers && existingWebhook.headers.length > 0) {
        setHeaders(existingWebhook.headers);
      }
    }
  }, [existingWebhook]);

  const handleAddHeader = () => {
    setHeaders((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: "key" | "value", val: string) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: val } : h))
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        throw new Error("Informe a URL de destino do webhook.");
      }
      if (!trimmedUrl.startsWith("https://")) {
        throw new Error("A URL de destino deve obrigatoriamente utilizar o protocolo seguro HTTPS.");
      }

      const validHeaders = headers.filter((h) => h.key.trim().length > 0);

      if (isEditing && webhookId) {
        return service.updateWebhook(webhookId, {
          eventType,
          url: trimmedUrl,
          retryEnabled,
          active,
          headers: validHeaders,
        });
      } else {
        return service.createWebhook({
          eventType,
          url: trimmedUrl,
          retryEnabled,
          active,
          headers: validHeaders,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks() });
      toast.success(
        isEditing
          ? "Endpoint atualizado com sucesso na demonstração."
          : "Novo webhook cadastrado com sucesso."
      );
      router.push("/integracoes/webhooks");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar webhook.");
    },
  });

  if (isEditing && isLoadingExisting) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="iconSm">
            <NextLink href="/integracoes/webhooks">
              <ArrowLeft className="size-4" />
            </NextLink>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEditing ? "Editar Endpoint de Webhook" : "Novo Endpoint de Webhook"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure as chamadas HTTP enviadas automaticamente para o seu servidor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <NextLink href="/integracoes/webhooks">Cancelar</NextLink>
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5 font-semibold"
          >
            <Save className="size-4" />
            <span>{saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Endpoint"}</span>
          </Button>
        </div>
      </div>

      {/* Card Configuração Principal */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="size-4 text-primary" />
            Parâmetros do Endpoint
          </CardTitle>
          <CardDescription className="text-xs">
            Escolha o evento Pix a ser escutado e informe o endereço receptor HTTPS.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Evento Acionador *</label>
            <Select
              value={eventType}
              onValueChange={(val) => setEventType(val as WebhookConfig["eventType"])}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX_RECEIVED">
                  Pix Recebido (PIX_RECEIVED) · Dispara quando um QR Code é liquidado com sucesso
                </SelectItem>
                <SelectItem value="PIX_SENT">
                  Pix Enviado (PIX_SENT) · Dispara quando uma transferência externa é finalizada
                </SelectItem>
                <SelectItem value="APPROVAL_REQUIRED">
                  Aprovação Pendente (APPROVAL_REQUIRED) · Dispara quando uma alçada é acionada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">URL de Destino (HTTPS) *</label>
              <span className="text-[10px] text-muted-foreground">Exige SSL/TLS Válido</span>
            </div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.suaempresa.com.br/webhooks/slopay"
              className="h-10 font-mono text-xs"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border border-border/60">
            <div>
              <p className="text-sm font-medium text-foreground">Retentativas Automáticas com Backoff</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Caso seu servidor retorne status 5xx ou timeout, a SloPay tentará entregar até 5 vezes em intervalos progressivos (1m, 5m, 15m, 1h, 6h).
              </p>
            </div>
            <Switch checked={retryEnabled} onCheckedChange={setRetryEnabled} />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border border-border/60">
            <div>
              <p className="text-sm font-medium text-foreground">Status do Endpoint</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando pausado, novos eventos gerados na plataforma não serão enviados a esta URL.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </CardContent>
      </Card>

      {/* Headers Personalizados */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Headers HTTP Customizados
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Envie tokens de autorização estáticos ou cabeçalhos proprietários do seu gateway/WAF.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddHeader}
              className="gap-1 text-xs"
            >
              <Plus className="size-3.5" />
              <span>Adicionar Header</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          {headers.map((h, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={h.key}
                onChange={(e) => handleHeaderChange(index, "key", e.target.value)}
                placeholder="Ex: X-Webhook-Token"
                className="h-9 font-mono text-xs flex-1"
              />
              <Input
                value={h.value}
                onChange={(e) => handleHeaderChange(index, "value", e.target.value)}
                placeholder="Ex: secret_abc123"
                className="h-9 font-mono text-xs flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                onClick={() => handleRemoveHeader(index)}
                title="Remover Header"
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground pt-1">
            * O cabeçalho <code>X-SloPay-Signature</code> com a assinatura criptográfica é anexado automaticamente em todas as mensagens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
