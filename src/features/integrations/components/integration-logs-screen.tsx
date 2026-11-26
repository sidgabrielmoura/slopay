"use client";

import { useRef, useState } from "react";
import { ChevronRight, FileSearch } from "lucide-react";
import { FilterInput, FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/dates";
import { integrationLogsPath, webhookLogsPath } from "../navigation";
import { logSucceeded, logTitle, previewLogs, type IntegrationLog, type LogTab } from "../preview-logs";
import { IntegrationHeading } from "./integration-heading";

const statusOptions = [
  { value: "all", label: "Todos os resultados" },
  { value: "success", label: "Sucesso" },
  { value: "failure", label: "Falha" },
];

function Status({ log }: { log: IntegrationLog }) {
  const success = logSucceeded(log);
  const label = log.status === null ? "Sem resposta" : `${log.status} · ${success ? "Sucesso" : "Falha"}`;
  return <Badge variant={success ? "success" : "warning"} className="whitespace-nowrap tabular-nums">{label}</Badge>;
}

function LogDetail({ log, onClose, restoreFocus }: { log: IntegrationLog | null; onClose: () => void; restoreFocus: () => void }) {
  return (
    <Dialog open={log !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus(); }}>
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>{log?.kind === "webhooks" ? "Detalhes da entrega" : "Detalhes da requisição"}</DialogTitle>
          <DialogDescription className="wrap-anywhere font-mono text-xs">{log?.id}</DialogDescription>
        </DialogHeader>
        {log && (
          <>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 basis-full sm:flex-1">
                <p className="wrap-anywhere text-sm font-semibold">{logTitle(log)}</p>
                <p className="mt-1 wrap-anywhere font-mono text-xs text-muted-foreground">{log.kind === "webhooks" ? log.endpoint : log.keyName}</p>
              </div>
              <Status log={log} />
            </div>
            <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Data e hora</dt><dd className="mt-1 tabular-nums"><time dateTime={log.at}>{formatDateTime(log.at, "short")}</time></dd></div>
              <div><dt className="text-xs text-muted-foreground">Duração</dt><dd className="mt-1 tabular-nums">{log.durationMs.toLocaleString("pt-BR")} ms</dd></div>
              {log.kind === "webhooks" && <div><dt className="text-xs text-muted-foreground">Tentativa</dt><dd className="mt-1 tabular-nums">{log.attempt}</dd></div>}
              {log.reference && <div><dt className="text-xs text-muted-foreground">Referência</dt><dd className="mt-1 wrap-anywhere font-mono text-xs">{log.reference}</dd></div>}
            </dl>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <LogBody label={log.kind === "webhooks" ? "Evento enviado" : "Corpo da requisição"} data={log.request} />
              <LogBody label={log.error ? "Erro de comunicação" : "Resposta"} data={log.response} fallback={log.error} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LogBody({ label, data, fallback = "Sem corpo de mensagem." }: { label: string; data?: Record<string, unknown>; fallback?: string }) {
  return (
    <section className="min-w-0 space-y-1.5">
      <h3 className="text-balance text-sm font-medium">{label}</h3>
      {data ? (
        <pre className="min-w-0 whitespace-pre-wrap wrap-anywhere rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed"><code>{JSON.stringify(data, null, 2)}</code></pre>
      ) : <p className="text-pretty rounded-lg border bg-background p-3 text-sm text-muted-foreground">{fallback}</p>}
    </section>
  );
}

function LogList({ tab }: { tab: LogTab }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<IntegrationLog | null>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const defaults = { query: "", status: "all", date: "" };
  const filtered = Boolean(query || date || status !== "all");
  function applyFilters(draft: typeof defaults) {
    setQuery(draft.query.trim());
    setStatus(draft.status);
    setDate(draft.date);
  }
  const isDelivery = tab === "webhooks";
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const day = date ? formatDateTime(date, "date-only") : null;
  const visible = previewLogs[tab].filter((log) => {
    const subject = log.kind === "webhooks" ? `${log.endpoint} ${log.event}` : log.keyName;
    const text = `${log.id} ${log.reference} ${logTitle(log)} ${subject}`.toLocaleLowerCase("pt-BR");
    return text.includes(normalizedQuery) && (status === "all" || logSucceeded(log) === (status === "success")) &&
      (!day || formatDateTime(log.at, "date-only") === day);
  });

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4 space-y-0 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="grid gap-1">
          <h2 className="text-balance text-lg font-semibold">{isDelivery ? "Entregas de webhooks" : "Requisições à API"}</h2>
          <p className="text-pretty text-sm text-muted-foreground">{isDelivery ? "Acompanhe as tentativas de envio e as respostas dos seus endpoints." : "Consulte as chamadas feitas à API, o status HTTP e o corpo da resposta."}</p>
        </div>
        <FilterSheet value={{ query, date, status }} defaults={defaults} active={filtered} onApply={applyFilters}>
          {(draft, setDraft) => <>
            <FilterInput label="Buscar nos logs" placeholder={isDelivery ? "Evento, endpoint ou referência" : "Rota, chave ou referência"}
              value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} />
            <FilterInput type="date" label="Data" value={draft.date} className="scheme-dark"
              onChange={event => setDraft({ ...draft, date: event.target.value })} />
            <FilterSelect label="Resultado" options={statusOptions} value={draft.status}
              onChange={status => setDraft({ ...draft, status })} />
          </>}
        </FilterSheet>
      </CardHeader>

      <div className="flex min-w-0 items-center justify-between gap-2 bg-background/40 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        <p aria-live="polite" className="tabular-nums">{visible.length} {visible.length === 1 ? "registro" : "registros"}</p>
        <p>Horário de Brasília</p>
      </div>
      {visible.length ? (
        <ul className="divide-y divide-border border-t" aria-label={isDelivery ? "Tentativas de entrega" : "Histórico de requisições"}>
          {visible.map((log) => (
            <li key={log.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_7.5rem_auto] sm:px-5">
              <div className="min-w-0">
                <h3 className="wrap-anywhere text-sm font-semibold">{logTitle(log)}</h3>
                <p className="mt-1 line-clamp-2 wrap-anywhere font-mono text-xs text-muted-foreground">{log.kind === "webhooks" ? log.endpoint : log.keyName}</p>
              </div>
              <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-2 sm:col-start-2 sm:row-start-1">
                <Status log={log} />
                {log.kind === "webhooks" && <span className="text-xs text-muted-foreground tabular-nums">{log.attempt}ª tentativa</span>}
              </div>
              <time dateTime={log.at} className="col-start-1 row-start-3 text-xs text-muted-foreground tabular-nums sm:col-start-3 sm:row-start-1">
                {formatDateTime(log.at, "short")}
              </time>
              <Button type="button" variant="ghost" size="icon" className="col-start-2 row-span-3 row-start-1 size-11 text-muted-foreground sm:col-start-4 sm:row-span-1"
                aria-label={`Ver detalhes de ${logTitle(log)}, ${log.id}`} onClick={(event) => {
                  detailTrigger.current = event.currentTarget;
                  setSelected(log);
                }}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<FileSearch aria-hidden="true" />} className="rounded-none border-0 border-t" title="Nenhum registro encontrado"
          action={filtered && <Button type="button" variant="outline" className="h-11" onClick={() => applyFilters(defaults)}>Limpar filtros</Button>} />
      )}
      <LogDetail log={selected} onClose={() => setSelected(null)} restoreFocus={() => detailTrigger.current?.focus()} />
    </Card>
  );
}

export function IntegrationLogsScreen({ initialTab }: { initialTab: LogTab }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading preview title="Logs" description="Inspecione as chamadas à API e as notificações enviadas à sua aplicação." />
      <Tabs value={tab} onValueChange={(next) => {
        const nextTab = next === "webhooks" ? "webhooks" : "requisicoes";
        setTab(nextTab);
        window.history.replaceState(null, "", nextTab === "webhooks" ? webhookLogsPath : integrationLogsPath);
      }} className="min-w-0">
        <TabsList aria-label="Tipos de log" className="grid h-auto w-full grid-cols-2 justify-start sm:inline-grid sm:w-auto">
          <TabsTrigger value="requisicoes" className="min-h-11 px-3 data-[state=active]:bg-sidebar-accent data-[state=active]:text-primary sm:px-4">Requisições</TabsTrigger>
          <TabsTrigger value="webhooks" className="min-h-11 px-3 data-[state=active]:bg-sidebar-accent data-[state=active]:text-primary sm:px-4">Webhooks</TabsTrigger>
        </TabsList>
        <TabsContent value="requisicoes" className="mt-4"><LogList tab="requisicoes" /></TabsContent>
        <TabsContent value="webhooks" className="mt-4"><LogList tab="webhooks" /></TabsContent>
      </Tabs>
    </div>
  );
}
