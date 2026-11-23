"use client";

import { ExpenseCharts } from "@/features/expenses/components/expense-charts";
import { fetchLiveTransactions } from "../live-transactions";
import type { TransactionTab } from "../transaction-presentation";
import { StatementScreen } from "./statement-screen";

export function LiveTransactionsScreen({ initialTab, initialSearch, merchantId, owner = true }: {
  initialTab: TransactionTab;
  initialSearch?: string;
  merchantId: string;
  owner?: boolean;
}) {
  return (
    <StatementScreen
      available
      initialTab={initialTab}
      initialSearch={initialSearch}
      merchantId={merchantId}
      owner={owner}
      afterTable={owner && initialTab === "OUT" ? <ExpenseCharts merchantId={merchantId} preview /> : undefined}
      fetchPage={async (filters, signal) => {
        const result = await fetchLiveTransactions(filters, signal);
        return {
          ...result,
          data: result.data.map((tx) => ({
            ...tx,
            counterparty: tx.direction === "OUT" ? "Favorecido" : tx.description,
            counterpartyReference: tx.destination ?? tx.providerId,
          })),
        };
      }}
    />
  );
}
