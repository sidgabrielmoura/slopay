"use client";

import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Layers, Plus, RotateCw } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { expenseKeys } from "@/features/expenses/expense-gateway";
import { expenseCategoryPresentation } from "@/features/expenses/expenses";
import { pixKeyLabels, withdrawalIssue, withdrawalStatusLabel } from "@/features/pix-withdraw/pix-withdrawal";
import { recentWithdrawalsKey, withdrawalOptionsKey } from "@/features/pix-withdraw/pix-withdrawal-gateway";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { usePreferences } from "@/providers/preferences-provider";
import { batchIsPending, batchesPath, batchStatus, type BatchSummary } from "../live-batches";
import { batchKeys, liveBatchesGateway } from "../live-batches-gateway";

function BatchStatus({ state }: { state: BatchSummary["state"] }) {
  const status = batchStatus[state];
  return <Badge variant={status.variant}>{status.label}</Badge>;
}

function BatchLoading() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Carregando lotes">
      <Skeleton className="h-12 motion-reduce:animate-none" />
      <Skeleton className="h-12 motion-reduce:animate-none" />
      <Skeleton className="h-12 motion-reduce:animate-none" />
    </div>
  );
}

export function LiveBatchHistory({ merchantId, canCreate }: { merchantId: string; canCreate: boolean }) {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: [...batchKeys.list(merchantId), page],
    queryFn: ({ signal }) => liveBatchesGateway.list(page, signal),
    retry: false,
    refetchInterval: ({ state }) => state.data?.data.some(batchIsPending) ? 8_000 : false,
  });
  const data = history.data;
  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Saques em lote</h1>
            {data?.data[0]?.environment === "sandbox" && <Badge variant="secondary">Sandbox</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Autorize vários Pix juntos e acompanhe o resultado de cada transferência.</p>
        </div>
        {canCreate && (
          <Button asChild className="h-11">
            <Link href={batchesPath + "/novo"} prefetch={false}><Plus aria-hidden="true" /> Novo lote</Link>
          </Button>
        )}
      </header>
      <Card className="min-w-0">
        <CardHeader className="flex-row items-center justify-between gap-3 p-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Histórico de lotes</h2>
            {data && <p className="mt-1 text-sm text-muted-foreground">{data.total} {data.total === 1 ? "lote registrado" : "lotes registrados"}</p>}
          </div>
          <Button variant="outline" size="icon" aria-label="Atualizar lotes" className="size-11"
            onClick={() => void history.refetch()} disabled={history.isFetching}>
            <RotateCw aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ToastNotice message={history.isError ? history.error.message : null} />
          {history.isPending ? <BatchLoading /> : !data ? (
            <Empty icon={<Layers aria-hidden="true" />} title="Consulta de lotes indisponível"
              action={<Button variant="outline" onClick={() => void history.refetch()}>Consultar novamente</Button>} />
          ) : !data.total ? (
            <Empty icon={<Layers aria-hidden="true" />} title="Nenhum lote registrado"
              description="Monte uma lista com a chave Pix e o valor de cada favorecido." />
          ) : (
            <>
              <Table className="panel-operation-table min-w-[650px]">
                <TableCaption className="sr-only">Lotes de transferências Pix</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Conclusão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor do lote</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="font-medium">{batch.title || "Lote " + batch.id.slice(0, 8)}</div>
                        {batch.simulated && <span className="text-xs text-muted-foreground">Simulado</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        <time dateTime={batch.createdAt}>{formatDateTime(batch.createdAt, "short")}</time>
                      </TableCell>
                      <TableCell className="tabular-nums">{batch.completedCount} de {batch.count}</TableCell>
                      <TableCell><BatchStatus state={batch.state} /></TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums"><PanelAmount cents={batch.amountInCents} /></TableCell>
                      <TableCell className="text-right">
                        <Button asChild type="button" variant="ghost" className="h-11">
                          <Link href={batchesPath + "/" + batch.id} prefetch={false}>Detalhes <ArrowUpRight aria-hidden="true" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.totalPages > 1 && (
                <nav aria-label="Paginação de lotes" className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="icon" aria-label="Página anterior" className="size-11"
                    onClick={() => setPage(page - 1)} disabled={page <= 1 || history.isFetching}><ChevronLeft aria-hidden="true" /></Button>
                  <span className="text-sm tabular-nums">{page} de {data.totalPages}</span>
                  <Button variant="outline" size="icon" aria-label="Próxima página" className="size-11"
                    onClick={() => setPage(page + 1)} disabled={page >= data.totalPages || history.isFetching}><ChevronRight aria-hidden="true" /></Button>
                </nav>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function LiveBatchDetail({ merchantId, batchId }: { merchantId: string; batchId: string }) {
  const { reduceMotion } = usePreferences();
  const query = useQueryClient();
  const lastState = useRef<BatchSummary>(null);
  const [animate, setAnimate] = useState(false);
  const detail = useQuery({
    queryKey: batchKeys.detail(merchantId, batchId),
    queryFn: ({ signal }) => liveBatchesGateway.get(batchId, signal),
    retry: false,
    refetchInterval: ({ state }) => state.data && batchIsPending(state.data) ? 4_000 : false,
  });
  const batch = detail.data;
  useLayoutEffect(() => {
    if (!batch) return;
    const previous = lastState.current;
    lastState.current = batch;
    if (previous?.id !== batch.id) return;
    if (previous.state !== batch.state || previous.completedCount !== batch.completedCount) {
      void query.invalidateQueries({ queryKey: batchKeys.list(merchantId) });
    }
    if (previous.completedCount !== batch.completedCount) {
      void query.invalidateQueries({ queryKey: expenseKeys.account(merchantId) });
      void query.invalidateQueries({ queryKey: ["pix-statement", merchantId] });
      void query.invalidateQueries({ queryKey: recentWithdrawalsKey(merchantId) });
      void query.invalidateQueries({ queryKey: withdrawalOptionsKey(merchantId) });
    }
    if ((batch.state === "DONE" || batch.state === "FAILED") && previous.state !== batch.state && !reduceMotion &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAnimate(true);
  }, [batch, merchantId, query, reduceMotion]);
  const notFound = detail.error instanceof ApiError && detail.error.status === 404;
  return (
    <div className="grid min-w-0 gap-5">
      <Button asChild variant="ghost" className="h-11 w-fit">
        <Link href={batchesPath} prefetch={false}><ArrowLeft aria-hidden="true" /> Voltar aos lotes</Link>
      </Button>
      <ToastNotice message={detail.isError ? detail.error.message : null} />
      {detail.isPending ? <BatchLoading /> : !batch ? (
        <Empty title={notFound ? "Lote ainda não localizado" : "Consulta de lote indisponível"}
          description={notFound ? "Confira novamente se o envio acabou de ser autorizado." : undefined}
          action={<Button variant="outline" onClick={() => void detail.refetch()} disabled={detail.isFetching}>Consultar novamente</Button>} />
      ) : (
        <>
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{batch.title || "Detalhes do lote"}</h1>
                <BatchStatus state={batch.state} />
                {batch.environment === "sandbox" && <Badge variant="secondary">{batch.simulated ? "Simulado" : "Sandbox"}</Badge>}
              </div>
              <p className="break-all text-sm text-muted-foreground">
                Criado em <time dateTime={batch.createdAt}>{formatDateTime(batch.createdAt)}</time> · <span className="font-mono">{batch.id}</span>
              </p>
            </div>
            <Button variant="outline" className="h-11" onClick={() => void detail.refetch()} disabled={detail.isFetching}>
              <RotateCw aria-hidden="true" /> Atualizar
            </Button>
          </header>
          <Card className="grid gap-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="grid gap-1">
                <h2 className="text-lg font-semibold tracking-tight">Execução do lote</h2>
                <p className="text-sm text-muted-foreground">
                  {batch.completedCount} de {batch.count} Pix concluídos
                  {batch.failedCount > 0 && ` · ${batch.failedCount} encerrados`}
                  {batch.reviewCount > 0 && ` · ${batch.reviewCount} em revisão`}
                </p>
              </div>
              {(batch.state === "DONE" || batch.state === "FAILED") && (
                <LoadingConfirmation outcome={batch.state === "DONE" ? "success" : "failure"}
                  animate={animate && !reduceMotion} onEnd={() => setAnimate(false)} size={52} />
              )}
            </div>
            <Progress value={(batch.completedCount / batch.count) * 100}
              aria-label="Transferências concluídas" getValueLabel={() => `${batch.completedCount} de ${batch.count} Pix concluídos`}
              indicatorClassName={reduceMotion ? "transition-none" : "motion-reduce:transition-none"} />
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Valor do lote", cents: batch.amountInCents },
                { label: "Valor confirmado", cents: batch.completedAmountInCents },
                { label: "Tarifas registradas", cents: batch.recordedFeesInCents },
              ].map(({ label, cents }) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{cents === null ? "—" : <PanelAmount cents={cents} />}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="p-5"><h2 className="text-lg font-semibold tracking-tight">Transferências</h2></CardHeader>
            <CardContent className="px-5 pb-5">
              <Table className="panel-operation-table min-w-[670px]">
                <TableCaption className="sr-only">Transferências individuais do lote</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destino</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Tarifa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.transfers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link href={`/movimentacoes/saque-${item.id}?origem=OUT`} prefetch={false}
                          className="inline-flex min-h-11 items-center font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                          Pix {item.position} · {item.destination}
                        </Link>
                        <p className="text-xs text-muted-foreground">{pixKeyLabels[item.pixKeyType]}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.expenseCategory ? expenseCategoryPresentation[item.expenseCategory].label : "Sem categoria"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.state === "DONE" ? "success" : item.state === "FAILED" ? "destructive"
                          : item.state === "REVIEW" || item.state === "BLOCKED" ? "warning" : "secondary"}>
                          {withdrawalStatusLabel(item)}
                        </Badge>
                        {item.confirmedAt && <time dateTime={item.confirmedAt} className="mt-1 block text-xs text-muted-foreground">{formatDateTime(item.confirmedAt, "short")}</time>}
                        {withdrawalIssue(item) && <p className="mt-1 max-w-52 text-xs text-muted-foreground">{withdrawalIssue(item)}</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums"><PanelAmount cents={item.amountInCents} /></TableCell>
                      <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                        {item.feeInCents === null ? "—" : <PanelAmount cents={item.feeInCents} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
