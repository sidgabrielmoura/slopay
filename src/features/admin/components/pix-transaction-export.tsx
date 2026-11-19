"use client";

import { formatDateTime } from "@/lib/dates";
import { adminPixTransactions, pixKindLabels, pixStatusLabels, type PixTransactionsQuery } from "../admin-pix-transactions";
import { AdminCsvExport, downloadAdminCsv } from "./admin-csv-export";

async function exportPage(query: PixTransactionsQuery) {
  const { pagination, items } = await adminPixTransactions.list(query);
  if (pagination.page !== query.page || !items.length) {
    throw new Error("A página mudou. Confira os resultados antes de exportar.");
  }
  const columns = ["ID Slopay", "Operação", "Empresa", "Carteira (final)", "Data", "Situação", "Valor (BRL)", "Tarifa (BRL)"];
  const rows = items.map((item) => [
    item.id, pixKindLabels[item.kind], item.company, item.walletSuffix,
    formatDateTime(item.occurredAt, item.dateOnly ? "date-only" : "medium"), pixStatusLabels[item.status],
    { cents: item.amountInCents }, item.feeInCents === null ? "" : { cents: item.feeInCents },
  ]);
  downloadAdminCsv(`transacoes-pix-pagina-${query.page}.csv`, columns, rows);
}

export function PixTransactionExport({ query, disabled, onRefresh }: {
  query: PixTransactionsQuery; disabled: boolean; onRefresh: () => void;
}) {
  return <AdminCsvExport page={query.page} disabled={disabled} onExport={() => exportPage(query)} onRefresh={onRefresh}
    description="O arquivo vai incluir os valores e as tarifas das transações desta página com os filtros atuais." />;
}
