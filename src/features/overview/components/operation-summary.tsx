import Link from "next/link";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import type { DashboardOperation, DashboardSummary } from "@/lib/server/dashboard";

export const operationStatus = {
  SAMPLE: "Exemplo",
  PENDING: "Pendente",
  PROCESSING: "Em processamento",
  PAID: "Marcado como pago",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
} satisfies Record<DashboardOperation["status"], string>;

export function OperationsSummary({
  summary,
  showRecent = true,
}: {
  summary: DashboardSummary | null;
  showRecent?: boolean;
}) {
  if (!summary) {
    return (
      <ToastNotice message="O resumo está temporariamente indisponível. Recarregue a página para tentar novamente." persistent />
    );
  }

  const sandbox = summary.environment === "sandbox";
  return (
    <section className="space-y-4" aria-labelledby="operations-heading">
      <div className="flex items-center gap-3">
        <h2 id="operations-heading" className="text-lg font-semibold">Resumo de operações</h2>
        {sandbox && <Badge variant="outline">Sandbox</Badge>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm text-muted-foreground">{sandbox ? "Operações de teste" : "Operações registradas"}</h3>
          <p className="text-2xl font-semibold tabular-nums">{summary.operationsCount}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm text-muted-foreground">
            {sandbox ? "Valor total dos exemplos" : "Valor total dos registros"}
          </h3>
          <p className="text-2xl font-semibold tabular-nums"><PanelAmount cents={summary.totalAmountInCents} /></p>
        </div>
      </div>
      {showRecent && (summary.recentOperations.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="panel-operation-table w-full text-left text-sm">
            <caption className="sr-only">Até dez operações mais recentes</caption>
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Descrição</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 font-medium">Data</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.recentOperations.map((operation) => (
                <tr key={operation.reference}>
                  <td className="px-4 py-3">
                    <Link href={`/movimentacoes/${encodeURIComponent(operation.reference)}`} prefetch={false}
                      className="underline-offset-4 hover:underline">
                      {operation.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{operationStatus[operation.status]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    <time dateTime={operation.createdAt}>{formatDateTime(operation.createdAt)}</time>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    <PanelAmount cents={operation.amountInCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {sandbox ? "Nenhuma operação de teste nesta conta." : "Nenhuma operação registrada nesta conta."}
        </p>
      ))}
    </section>
  );
}
