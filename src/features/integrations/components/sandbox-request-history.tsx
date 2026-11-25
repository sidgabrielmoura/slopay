"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, RotateCw } from "lucide-react";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/dates";
import { ApiError } from "@/lib/api-client";
import { integrationApiGateway } from "../sandbox-api";

export function SandboxRequestHistory({ accountId }: { accountId: string }) {
  const [page, setPage] = useState(1);
  const development = useDevelopmentFeatures();
  const logs = useQuery({
    queryKey: ["integration-request-logs", accountId, development, page],
    queryFn: ({ signal }) => integrationApiGateway(development).requestLogs(page, signal),
    retry: false,
  });
  const pagination = logs.data?.pagination;
  const disabled = logs.error instanceof ApiError && logs.error.status === 404;

  return (
    <Card className="min-w-0 gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div className="grid min-w-0 gap-1">
          <CardTitle>Histórico de requisições</CardTitle>
          <CardDescription>Chamadas com chaves da empresa nos últimos 30 dias.</CardDescription>
        </div>
        <Button type="button" variant="outline" disabled={logs.isFetching} onClick={() => void logs.refetch()}>
          <RotateCw size={16} aria-hidden="true" /> Atualizar
        </Button>
      </CardHeader>
      {logs.isPending ? (
        <div className="grid gap-3 p-4" aria-busy="true" aria-label="Carregando requisições">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}
        </div>
      ) : logs.isError || !logs.data.items.length ? (
        <Empty icon={<FileText aria-hidden="true" />} className="rounded-none border-0"
          title={disabled ? "API desativada" : logs.isError ? "Histórico indisponível" : "Nenhuma requisição registrada"}
          description={disabled ? "O histórico aparece quando a API estiver habilitada neste ambiente."
            : logs.isError ? "Atualize para tentar carregar esta página." : "As chamadas autenticadas da API aparecerão aqui."} />
      ) : (
        <ul className="divide-y" aria-label="Requisições da API">
          {logs.data.items.map((item) => (
            <li key={item.id} className="grid min-w-0 items-center gap-3 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto] sm:px-5">
              <div className="grid min-w-0 gap-1">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="shrink-0 font-mono text-xs font-semibold">{item.method}</span>
                  <code className="min-w-0 wrap-anywhere text-xs">{item.route}</code>
                </div>
                <div className="min-w-0 wrap-anywhere text-xs text-muted-foreground">ID de rastreio <code className="select-all">{item.correlationId}</code></div>
              </div>
              <div className="grid min-w-0 gap-1 tabular-nums">
                <time dateTime={item.recordedAt}>{formatDateTime(item.recordedAt)}</time>
                <span className="wrap-anywhere text-xs text-muted-foreground">{item.keyLabel ?? "Chave da integração"}</span>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <Badge variant={item.status < 300 ? "success" : item.status >= 400 ? "warning" : "secondary"}>{item.status}</Badge>
                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{item.durationMs} ms</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {pagination && <TablePagination {...pagination} busy={logs.isFetching} onPageChange={setPage} label="Paginação das requisições" />}
    </Card>
  );
}
