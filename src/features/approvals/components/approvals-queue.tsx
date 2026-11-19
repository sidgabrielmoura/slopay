"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, History, ListChecks, RotateCw } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ApprovalRequest, ApprovalRequestStatus } from "@/types/domain";

type QueueState =
  | { state: "ready"; requests: ApprovalRequest[] }
  | { state: "loading" | "unavailable" | "error" };

const statusLabels: Record<ApprovalRequestStatus, { label: string; variant: BadgeProps["variant"] }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  APPROVED: { label: "Aprovada", variant: "success" },
  REJECTED: { label: "Recusada", variant: "destructive" },
};

const tabClass = "h-11 gap-2 rounded-none border-b-2 border-transparent px-1 focus-visible:ring-inset data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none";
const rowLayout = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:px-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] lg:gap-x-5";

export function ApprovalsQueue({ queue, refresh }: {
  queue: QueueState;
  refresh?: { busy: boolean; run: () => void };
}) {
  const pending = queue.state === "ready"
    ? queue.requests.filter((item) => item.status === "PENDING")
      .toSorted((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
    : [];
  const history = queue.state === "ready"
    ? queue.requests.filter((item) => item.status !== "PENDING")
      .toSorted((first, second) => Date.parse(second.resolvedAt ?? second.createdAt) - Date.parse(first.resolvedAt ?? first.createdAt))
    : [];

  return (
    <div className="min-w-0 space-y-5">
      <header className="space-y-1">
        <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Aprovações</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Acompanhe as solicitações de saque e as decisões da equipe.
        </p>
      </header>

      <Card className="min-w-0">
        <Tabs defaultValue="pending">
          <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-border px-4 sm:px-5">
            <TabsList aria-label="Status das aprovações" className="h-auto gap-5 rounded-none bg-transparent p-0">
              <TabsTrigger value="pending" className={tabClass}>
                Pendentes
                {pending.length > 0 && (
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-medium tabular-nums text-secondary-foreground">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className={tabClass}>Histórico</TabsTrigger>
            </TabsList>
            {refresh && queue.state !== "error" && (
              <Button type="button" variant="ghost" size="icon" aria-label="Atualizar aprovações"
                className="size-11 text-muted-foreground"
                disabled={refresh.busy} onClick={refresh.run}>
                <RotateCw aria-hidden="true" />
              </Button>
            )}
          </div>
          <TabsContent value="pending" className="mt-0 rounded-b-xl focus-visible:ring-inset">
            <QueuePane state={queue.state} items={pending} history={false} onRetry={refresh?.run} />
          </TabsContent>
          <TabsContent value="history" className="mt-0 rounded-b-xl focus-visible:ring-inset">
            <QueuePane state={queue.state} items={history} history onRetry={refresh?.run} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function QueuePane({ state, items, history, onRetry }: {
  state: QueueState["state"];
  items: ApprovalRequest[];
  history: boolean;
  onRetry?: () => void;
}) {
  if (state === "loading") {
    return (
      <div className="space-y-3 p-5" aria-busy="true">
        <p role="status" className="sr-only">Carregando aprovações</p>
        {[1, 2, 3].map((row) => <Skeleton key={row} className="h-16 motion-reduce:animate-none" />)}
      </div>
    );
  }

  if (state === "error") {
    return (
      <QueueMessage
        title="Aprovações temporariamente indisponíveis"
        action={onRetry && <Button type="button" variant="outline" className="h-11" onClick={onRetry}>Tentar novamente</Button>}
      />
    );
  }

  if (state === "unavailable") {
    return (
      <QueueMessage
        title={history ? "Histórico ainda indisponível" : "Fila de aprovações ainda indisponível"}
        description={history
          ? "As decisões serão registradas aqui quando a fila estiver disponível."
          : "As solicitações aparecerão aqui quando as regras e permissões de aprovação estiverem configuradas."}
        history={history}
        action={<Button asChild variant="outline" className="h-11">
          <Link href="/movimentacoes" prefetch={false}>Ver movimentações <ArrowRight aria-hidden="true" /></Link>
        </Button>}
      />
    );
  }

  if (items.length === 0) {
    return <QueueMessage title={history ? "Nenhuma decisão registrada" : "Nenhuma solicitação pendente"} history={history} />;
  }

  return (
    <>
      <div aria-hidden="true" className={cn(rowLayout, "hidden border-b border-border py-3 text-xs font-medium text-muted-foreground lg:grid")}>
        <span>Solicitação</span>
        <span>Solicitante</span>
        <span>{history ? "Decisão" : "Aprovações"}</span>
        <span className="text-right">Valor total</span>
        <span className="w-4" />
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => <ApprovalRow key={item.id} item={item} history={history} />)}
      </ul>
    </>
  );
}

function QueueMessage({ title, description, history, action }: {
  title: string;
  description?: string;
  history?: boolean;
  action?: ReactNode;
}) {
  const Icon = history ? History : ListChecks;
  return (
    <div className="grid min-h-64 content-center justify-items-center gap-2 px-5 py-10 text-center">
      <div className="mb-1 grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-balance text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function ApprovalRow({ item, history }: { item: ApprovalRequest; history: boolean }) {
  const status = statusLabels[item.status];
  const date = history ? item.resolvedAt ?? item.createdAt : item.createdAt;
  return (
    <li className="last:rounded-b-xl">
      <Link href={`/aprovacoes/${encodeURIComponent(item.id)}`} prefetch={false}
        className={cn(rowLayout, "min-h-16 gap-y-2 rounded-[inherit] py-3 hover:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring")}>
        <div className="col-start-1 row-start-1 min-w-0">
          <p className="truncate text-sm font-semibold">{item.counterpartyName}</p>
          <p className="text-xs text-muted-foreground">{item.operationType === "WITHDRAWAL" ? "Saque direto" : "Saque em lote"}</p>
        </div>
        <div className="col-start-1 row-start-2 min-w-0 text-xs lg:col-start-2 lg:row-start-1">
          <p className="truncate text-sm">{item.requesterName}</p>
          <time dateTime={date} className="text-muted-foreground tabular-nums">{formatDateTime(date, "short")}</time>
        </div>
        <div className="col-start-2 row-start-2 text-right lg:col-start-3 lg:row-start-1 lg:text-left">
          {history ? <Badge variant={status.variant}>{status.label}</Badge> : (
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              {item.currentApprovalsCount} de {item.requiredApprovals} aprovações
            </p>
          )}
        </div>
        <div className="col-start-2 row-start-1 text-right lg:col-start-4">
          <span className="sr-only">Valor total</span>
          <p className="whitespace-nowrap text-sm font-semibold tabular-nums"><PanelAmount cents={item.totalInCents} /></p>
        </div>
        <ChevronRight aria-hidden="true" className="col-start-5 row-start-1 hidden size-4 text-muted-foreground lg:block" />
      </Link>
    </li>
  );
}
