"use client";

import { useRef, useState, type FormEvent } from "react";
import { LockKeyhole, Network, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useIntegrationsPreview } from "../preview-provider";
import type { PreviewIpRange, PreviewWithdrawalValidation } from "../preview-data";
import { IntegrationHeading } from "./integration-heading";

function parseIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((address, part) => address * 256 + Number(part), 0);
}

function IpRanges({ readOnly }: { readOnly: boolean }) {
  const { allowedIps, setAllowedIps } = useIntegrationsPreview();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PreviewIpRange | null>(null);
  const [invalid, setInvalid] = useState<"start" | "end">();
  const addButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement | null>(null);

  function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const start = String(form.get("start") ?? "").trim();
    const end = String(form.get("end") ?? "").trim();
    const first = parseIpv4(start);
    const last = end ? parseIpv4(end) : first;
    const overlaps = first !== null && last !== null && allowedIps.some((rule) => {
      const lower = parseIpv4(rule.start);
      const upper = parseIpv4(rule.end ?? rule.start);
      return lower !== null && upper !== null && first <= upper && last >= lower;
    });
    const problem = first === null ? { field: "start", message: "Informe um endereço IPv4 inicial válido." } as const
      : last === null ? { field: "end", message: "Informe um endereço IPv4 final válido." } as const
      : last < first || last - first > 50 ? { field: "end", message: "Informe um IP final igual ao inicial ou até 50 endereços acima." } as const
      : overlaps ? { field: "start", message: "Esse endereço ou intervalo se sobrepõe a uma regra cadastrada." } as const
      : null;
    if (problem) {
      setInvalid(problem.field);
      event.currentTarget.querySelector<HTMLInputElement>(`#ip-${problem.field}`)?.focus();
      toast.error(problem.message);
      return;
    }

    const rule = { id: crypto.randomUUID(), start, end: end && end !== start ? end : undefined };
    setAllowedIps((current) => [...current, rule]);
    setOpen(false);
    toast.success("Endereço adicionado à simulação.");
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3 space-y-0 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-2">
          <Network className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-balance text-lg font-semibold">IPs autorizados</h2>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Restrinja o uso das chaves de API a endereços ou intervalos conhecidos.</p>
      </CardHeader>
      {allowedIps.length ? (
        <ul className="divide-y divide-border border-y" aria-label="Endereços autorizados">
          {allowedIps.map((rule) => (
            <li key={rule.id} className="flex min-h-16 items-center justify-between gap-2 px-4 py-2 sm:px-5">
              <div className="min-w-0">
                <p className="wrap-anywhere font-mono text-sm tabular-nums">{rule.start}{rule.end ? ` a ${rule.end}` : ""}</p>
                <p className="mt-1 text-xs text-muted-foreground">{rule.end ? "Intervalo IPv4" : "Endereço IPv4"}</p>
              </div>
              {!readOnly && (
                <Button type="button" size="icon" variant="ghost" className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${rule.start}`} onClick={(event) => { removeButton.current = event.currentTarget; setTarget(rule); }}>
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<Network aria-hidden="true" />} className="rounded-none border-x-0" title="Nenhuma restrição de IP configurada" />
      )}
      {!readOnly && (
        <div className="p-4 sm:p-5">
          <Dialog open={open} onOpenChange={(next) => { setOpen(next); setInvalid(undefined); }}>
            <DialogTrigger asChild>
              <Button ref={addButton} variant="outline" className="h-11"><Plus aria-hidden="true" /> Adicionar IP</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
              <DialogHeader className="pr-5 text-left">
                <DialogTitle>Adicionar endereço autorizado</DialogTitle>
                <DialogDescription>Preencha o IP inicial. Para autorizar um intervalo, preencha também o IP final.</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={addAddress}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label htmlFor="ip-start" className="text-sm font-medium">IP inicial</label>
                    <Input id="ip-start" name="start" required maxLength={15} autoComplete="off" spellCheck={false} className="h-11 font-mono"
                      placeholder="192.0.2.24" aria-invalid={invalid === "start" || undefined} onChange={() => setInvalid(undefined)} />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="ip-end" className="text-sm font-medium">IP final <span className="text-muted-foreground">(opcional)</span></label>
                    <Input id="ip-end" name="end" maxLength={15} autoComplete="off" spellCheck={false} className="h-11 font-mono"
                      placeholder="192.0.2.29" aria-invalid={invalid === "end" || undefined} onChange={() => setInvalid(undefined)} />
                  </div>
                </div>
                <Button type="submit" className="h-11 justify-self-end">Adicionar endereço</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <AlertDialog open={target !== null} onOpenChange={(next) => { if (!next) setTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg" onCloseAutoFocus={(event) => {
          event.preventDefault();
          (removeButton.current?.isConnected ? removeButton.current : addButton.current)?.focus();
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover endereço autorizado?</AlertDialogTitle>
            <AlertDialogDescription>{target?.start}{target?.end ? ` a ${target.end}` : ""} será removido da lista de simulação.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-11" onClick={() => {
              const id = target?.id;
              setAllowedIps((current) => current.filter((rule) => rule.id !== id));
              toast.success("Endereço removido da simulação.");
            }}>Remover endereço</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function WithdrawalValidationForm({ configuration, onSave }: {
  configuration: PreviewWithdrawalValidation;
  onSave: (values: PreviewWithdrawalValidation) => void;
}) {
  const [enabled, setEnabled] = useState(configuration.enabled);
  const [includePanel, setIncludePanel] = useState(configuration.includePanel);
  const [invalid, setInvalid] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const url = String(form.get("url") ?? "").trim();
    const address = URL.canParse(url) ? new URL(url) : null;
    if (url && (!address || address.protocol !== "https:" || address.username || address.password || address.hash)) {
      setInvalid(true);
      event.currentTarget.querySelector<HTMLInputElement>("#validation-url")?.focus();
      toast.error("Informe uma URL HTTPS sem credenciais ou fragmento.");
      return;
    }
    const hasToken = Boolean(String(form.get("token") ?? "").trim()) || configuration.hasToken && !form.has("removeToken");
    onSave({ enabled, includePanel, url, email: String(form.get("email") ?? "").trim(), hasToken });
  }

  return (
    <form className="grid min-w-0 gap-4" onSubmit={save}>
      <label className="flex min-h-11 items-center justify-between gap-2 border-b pb-2 text-sm font-medium">
        Ativar validação de saques
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="validation-url" className="text-sm font-medium">URL de validação</label>
        <Input id="validation-url" name="url" type="url" required={enabled} defaultValue={configuration.url}
          autoComplete="off" spellCheck={false} className="h-11 font-mono text-xs" aria-invalid={invalid || undefined}
          onChange={() => setInvalid(false)} placeholder="https://financeiro.example.com/validar-saida" />
      </div>
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="validation-email" className="text-sm font-medium">E-mail de alertas</label>
        <Input id="validation-email" name="email" type="email" required={enabled} defaultValue={configuration.email}
          autoComplete="off" className="h-11" placeholder="operacoes@example.com" />
      </div>
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="validation-token" className="text-sm font-medium">Token de exemplo <span className="text-muted-foreground">(opcional)</span></label>
        <Input id="validation-token" name="token" type="password" autoComplete="new-password" className="h-11"
          placeholder={configuration.hasToken ? "Token de exemplo configurado" : undefined} />
        {configuration.hasToken && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox name="removeToken" />
            Remover token de exemplo atual
          </label>
        )}
      </div>
      <label className="flex min-h-11 items-center justify-between gap-2 border-t pt-2 text-sm">
        Incluir saques iniciados pelo painel
        <Switch checked={includePanel} disabled={!enabled} onCheckedChange={setIncludePanel} />
      </label>
      <Button type="submit" className="h-11 justify-self-end">Salvar configuração de exemplo</Button>
    </form>
  );
}

function WithdrawalValidation({ readOnly }: { readOnly: boolean }) {
  const { withdrawalValidation, setWithdrawalValidation } = useIntegrationsPreview();
  const [open, setOpen] = useState(false);

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3 space-y-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <LockKeyhole className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-balance text-lg font-semibold">Validação de saques</h2>
          </div>
          <Badge variant={withdrawalValidation.enabled ? "success" : "secondary"}>{withdrawalValidation.enabled ? "Ativa" : "Desativada"}</Badge>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Configure um endpoint para sua aplicação autorizar ou recusar saques antes do processamento.</p>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <dl className="grid min-w-0 gap-3 rounded-lg border bg-background p-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Endpoint de validação</dt><dd className="mt-1 wrap-anywhere font-mono text-xs">{withdrawalValidation.url || "A definir"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">E-mail de alertas</dt><dd className="mt-1 wrap-anywhere">{withdrawalValidation.email || "A definir"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Operações incluídas</dt><dd className="mt-1">{withdrawalValidation.enabled ? withdrawalValidation.includePanel ? "API e painel" : "API" : "Validação desativada"}</dd></div>
        </dl>
        {!readOnly && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 justify-self-start"><Settings2 aria-hidden="true" /> Editar validação</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader className="pr-5 text-left">
                <DialogTitle>Validação de saques</DialogTitle>
                <DialogDescription>Defina o destino de exemplo para as solicitações de autorização.</DialogDescription>
              </DialogHeader>
              <WithdrawalValidationForm configuration={withdrawalValidation} onSave={(values) => {
                setWithdrawalValidation(values);
                setOpen(false);
                toast.success("Configuração de exemplo salva.");
              }} />
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

export function IntegrationSecurityScreen({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading preview title="Segurança da integração" description="Controle de onde a API pode ser chamada e como os saques são autorizados." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <IpRanges readOnly={readOnly} />
        <WithdrawalValidation readOnly={readOnly} />
      </div>
    </div>
  );
}
