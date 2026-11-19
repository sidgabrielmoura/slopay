"use client";

import { useGatewayService } from "@/providers/demo-provider";
import type { TransactionTab } from "../transaction-presentation";
import { StatementScreen } from "./statement-screen";

export function TransactionsScreen({ initialTab = "ALL" }: { initialTab?: TransactionTab }) {
  const service = useGatewayService();

  return (
    <StatementScreen
      initialTab={initialTab}
      fetchPage={async (filters) => {
        const result = await service.getTransactions({ ...filters, pageSize: 10 });
        return {
          ...result,
          environment: "demo",
          data: result.data.map((tx) => ({
            ...tx,
            reference: tx.id,
            counterparty: tx.counterpartyName,
            counterpartyReference: tx.counterpartyDocument || tx.counterpartyKey,
            document: tx.counterpartyDocument,
            netInCents: tx.amountInCents,
          })),
        };
      }}
    />
  );
}
