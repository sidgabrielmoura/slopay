"use client";

import { useRef, useState, type FormEvent } from "react";
import { CirclePause, CirclePlay, Copy, Ellipsis, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { formatDateTime } from "@/lib/dates";
import { apiKeyEnvironments, type ApiKeyEnvironment, type PreviewApiKey } from "../preview-data";
import { useIntegrationsPreview } from "../preview-provider";
import { IntegrationHeading } from "./integration-heading";

const environmentOptions = [
  { value: "sandbox", label: apiKeyEnvironments.sandbox },
  { value: "production", label: apiKeyEnvironments.production },
];

const environmentFilters = [{ value: "all", label: "Todos os ambientes" }, ...environmentOptions];

function CreateApiKey({ environment }: { environment: ApiKeyEnvironment }) {
  const { setApiKeys } = useIntegrationsPreview();
  const [result, setResult] = useState<{ name: string; value: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setNameInvalid(true);
      event.currentTarget.querySelector<HTMLInputElement>("#api-key-name")?.focus();
      toast.error("Informe um nome para a chave.");
      return;
    }

    const environment = form.get("environment") === "production" ? "production" : "sandbox";
    const id = crypto.randomUUID();
    const value = `slopay_mock_${environment}_${id}`;
    setApiKeys((current) => [{
      id, name, environment, enabled: true, suffix: value.slice(-4),
      createdAt: new Date().toISOString(), expiresOn: String(form.get("expiresOn") ?? "") || null, lastUsedAt: null,
    }, ...current]);
    setResult({ name, value });
  }

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Chave de exemplo copiada.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o valor para copiá-lo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) { setResult(null); setNameInvalid(false); }
    }}>
      <DialogTrigger asChild>
        <Button className="h-11 w-full sm:w-auto"><Plus aria-hidden="true" /> Nova chave</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>{result ? "Chave de exemplo criada" : "Nova chave de API"}</DialogTitle>
          <DialogDescription>
            {result ? "O valor completo aparece somente nesta etapa." : "Escolha o ambiente e dê um nome que identifique a aplicação."}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <>
            <div className="grid min-w-0 justify-items-start gap-2" role="status">
              <LoadingConfirmation size={40} animate />
              <p className="max-w-full wrap-anywhere text-sm font-medium">{result.name}</p>
              <code className="w-full select-all wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs">{result.value}</code>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => void copyKey(result.value)}
                ref={(button) => { button?.focus({ preventScroll: true }); }}><Copy aria-hidden="true" /> Copiar chave</Button>
              <Button type="button" className="h-11" onClick={() => { setOpen(false); setResult(null); }}>Concluir</Button>
            </div>
          </>
        ) : (
          <form className="grid gap-4" onSubmit={create}>
            <div className="grid gap-1.5">
              <label htmlFor="api-key-name" className="text-sm font-medium">Nome da chave</label>
              <Input id="api-key-name" name="name" className="h-11" required maxLength={80} autoComplete="off"
                placeholder="Ex. ERP · Conciliação" aria-invalid={nameInvalid || undefined} onChange={() => setNameInvalid(false)} />
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="api-key-environment" className="text-sm font-medium">Ambiente</label>
                <GlideSelect id="api-key-environment" name="environment" options={environmentOptions}
                  defaultValue={environment} required size="lg" className="w-full" />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="api-key-expiration" className="text-sm font-medium">Vencimento <span className="text-muted-foreground">(opcional)</span></label>
                <Input id="api-key-expiration" name="expiresOn" type="date" className="h-11 min-w-0 scheme-dark" />
              </div>
            </div>
            <Button type="submit" className="h-11 justify-self-end">Criar chave de exemplo</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysScreen({ readOnly = false }: { readOnly?: boolean }) {
  const { apiKeys, setApiKeys } = useIntegrationsPreview();
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<PreviewApiKey | null>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const actionsRef = useRef<HTMLButtonElement | null>(null);
  const visible = apiKeys.filter((key) => filter === "all" || key.environment === filter);

  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading preview title="Chaves de API" description="Gerencie as credenciais que identificam sua integração e autorizam chamadas à API."
        action={readOnly ? undefined : <CreateApiKey environment={filter === "production" ? "production" : "sandbox"} />} />

      <Card className="min-w-0">
        <CardHeader className="gap-3 space-y-0 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="grid gap-1">
            <h2 className="text-balance text-lg font-semibold">Chaves cadastradas</h2>
            <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">{visible.length} {visible.length === 1 ? "chave" : "chaves"}</p>
          </div>
          <GlideSelect ref={filterRef} ariaLabel="Filtrar por ambiente" options={environmentFilters} value={filter}
            onChange={setFilter} size="lg" className="w-full shrink-0 sm:w-52" />
        </CardHeader>
        {visible.length ? (
          <ul className="divide-y divide-border" aria-label="Chaves cadastradas">
            {visible.map((key) => (
              <li key={key.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] xl:items-center">
                <div className="min-w-0">
                  <h3 className="wrap-anywhere text-sm font-semibold">{key.name}</h3>
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <code className="font-mono" aria-label={`Chave com final ${key.suffix}`}>•••• {key.suffix}</code>
                    <span className="tabular-nums">Criada em <time dateTime={key.createdAt}>{formatDateTime(key.createdAt, "date-only")}</time></span>
                  </p>
                </div>
                <dl className="col-span-2 row-start-2 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4 xl:col-span-1 xl:col-start-2 xl:row-start-1">
                  <div><dt className="text-xs text-muted-foreground">Ambiente</dt><dd className="mt-1">{apiKeyEnvironments[key.environment]}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Vencimento</dt><dd className="mt-1 tabular-nums">{key.expiresOn ? <time dateTime={key.expiresOn}>{formatDateTime(key.expiresOn, "date-only")}</time> : "Sem data"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Último uso</dt><dd className="mt-1 tabular-nums">{key.lastUsedAt ? <time dateTime={key.lastUsedAt}>{formatDateTime(key.lastUsedAt, "short")}</time> : "Ainda sem uso"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-1"><Badge variant={key.enabled ? "success" : "secondary"}>{key.enabled ? "Habilitada" : "Desabilitada"}</Badge></dd></div>
                </dl>
                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost" className="col-start-2 row-start-1 size-11 text-muted-foreground xl:col-start-3"
                        aria-label={`Ações da chave ${key.name}`} onFocus={(event) => { actionsRef.current = event.currentTarget; }}><Ellipsis aria-hidden="true" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onCloseAutoFocus={(event) => { if (deleteTarget) event.preventDefault(); }}>
                      <DropdownMenuItem className="min-h-10" onSelect={() => {
                        setApiKeys((current) => current.map((item) => item.id === key.id ? { ...item, enabled: !item.enabled } : item));
                        toast.success(key.enabled ? "Chave desabilitada na simulação." : "Chave habilitada na simulação.");
                      }}>
                        {key.enabled ? <CirclePause aria-hidden="true" /> : <CirclePlay aria-hidden="true" />}
                        {key.enabled ? "Desabilitar" : "Habilitar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="min-h-10 text-destructive" onSelect={() => setDeleteTarget(key)}>
                        <Trash2 aria-hidden="true" /> Excluir chave
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<KeyRound aria-hidden="true" />} className="rounded-none border-0"
            title={filter === "all" ? "Nenhuma chave cadastrada" : "Nenhuma chave neste ambiente"}
            action={filter === "all" ? undefined : (
              <Button type="button" variant="outline" className="h-11" onClick={() => { setFilter("all"); filterRef.current?.focus(); }}>Ver todos os ambientes</Button>
            )} />
        )}
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg" onCloseAutoFocus={(event) => {
          event.preventDefault();
          (actionsRef.current?.isConnected ? actionsRef.current : filterRef.current)?.focus();
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-balance">Excluir chave de API?</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">A chave de exemplo {deleteTarget?.name} será removida da lista.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-11" onClick={() => {
              const id = deleteTarget?.id;
              setApiKeys((current) => current.filter((item) => item.id !== id));
              toast.success("Chave de exemplo excluída.");
            }}>Excluir chave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
