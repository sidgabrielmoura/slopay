"use client";

import { useRef, useState, type FormEvent } from "react";
import { CirclePause, CirclePlay, Ellipsis, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { TablePagination } from "@/components/shared/table-pagination";
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
import { formatDateTime } from "@/lib/dates";
import { apiKeyEnvironments, type ApiKeyEnvironment, type PreviewApiKey } from "../preview-data";
import { useIntegrationsPreview } from "../preview-provider";
import { ApiKeyIssuedContent } from "./api-key-issued-content";
import { IntegrationHeading } from "./integration-heading";

const environmentOptions = [
  { value: "sandbox", label: apiKeyEnvironments.sandbox },
  { value: "production", label: apiKeyEnvironments.production },
];

const environmentFilters = [{ value: "all", label: "Todos os ambientes" }, ...environmentOptions];
const pageSize = 8;

function CreateApiKey({ environment, onCreated }: { environment: ApiKeyEnvironment; onCreated: () => void }) {
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
    onCreated();
    setResult({ name, value });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) { setResult(null); setNameInvalid(false); }
    }}>
      <DialogTrigger asChild>
        <Button className="h-11 w-full sm:w-auto"><Plus aria-hidden="true" /> Nova chave</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto p-4 sm:max-w-lg sm:p-6"
        onInteractOutside={(event) => { if (result) event.preventDefault(); }}>
        {result ? (
          <ApiKeyIssuedContent example name={result.name} secret={result.value} onClose={() => { setOpen(false); setResult(null); }} />
        ) : (
          <>
            <DialogHeader className="pr-6 text-left">
              <DialogTitle className="text-balance text-xl leading-snug">Nova chave de API</DialogTitle>
              <DialogDescription>Escolha o ambiente e dê um nome que identifique a aplicação.</DialogDescription>
            </DialogHeader>
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
              <footer className="flex justify-end border-t pt-4">
                <Button type="submit" className="h-11">Criar chave de exemplo</Button>
              </footer>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysScreen({ readOnly = false }: { readOnly?: boolean }) {
  const { apiKeys, setApiKeys } = useIntegrationsPreview();
  const [filter, setFilter] = useState("all");
  const [requestedPage, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<PreviewApiKey | null>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const actionsRef = useRef<HTMLButtonElement | null>(null);
  const filtered = apiKeys.filter((key) => filter === "all" || key.environment === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function changeFilter(value: string) {
    setFilter(value);
    setPage(1);
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6">
      <IntegrationHeading preview title="Chaves de API" description="Gerencie as credenciais que identificam sua integração e autorizam chamadas à API."
        action={readOnly ? undefined : <CreateApiKey environment={filter === "production" ? "production" : "sandbox"} onCreated={() => setPage(1)} />} />

      <Card className="min-w-0">
        <CardHeader className="gap-3 space-y-0 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <KeyRound aria-hidden="true" className="size-5" />
            </div>
            <h2 className="text-balance text-lg font-semibold tracking-tight">Chaves cadastradas</h2>
          </div>
          <FilterSheet value={{ filter }} defaults={{ filter: "all" }} active={filter !== "all"} triggerRef={filterRef}
            onApply={draft => changeFilter(draft.filter)}>
            {(draft, setDraft) => <FilterSelect label="Ambiente" options={environmentFilters} value={draft.filter}
              onChange={filter => setDraft({ filter })} />}
          </FilterSheet>
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
              <Button type="button" variant="outline" className="h-11" onClick={() => { changeFilter("all"); filterRef.current?.focus(); }}>Ver todos os ambientes</Button>
            )} />
        )}
        {visible.length > 0 && <TablePagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} label="Paginação das chaves de API" />}
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
              if (visible.length === 1 && page > 1) setPage(page - 1);
              toast.success("Chave de exemplo excluída.");
            }}>Excluir chave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
