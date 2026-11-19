import { requestPixGateway } from "@/lib/pix-gateway-client";
import {
  expenseCategoryUpdateSchema,
  expenseItemsSchema,
  expenseSummarySchema,
  expensesUnavailable,
  type ExpenseCategory,
  type ExpenseCategoryFilter,
  type ExpensePeriod,
} from "./expenses";

export const expenseKeys = {
  account: (merchantId: string) => ["pix-expenses", merchantId] as const,
  summary: (merchantId: string, period: ExpensePeriod) => ["pix-expenses", merchantId, "summary", period] as const,
  items: (merchantId: string, period: ExpensePeriod, category: ExpenseCategoryFilter | null, page: number) =>
    ["pix-expenses", merchantId, "items", period, category, page] as const,
};

const route = "/api/dashboard/expenses";

export function fetchExpenseSummary(period: ExpensePeriod, signal: AbortSignal) {
  return requestPixGateway(route + "?" + new URLSearchParams({ period }), expenseSummarySchema, expensesUnavailable, { signal });
}

export function fetchExpenseItems(period: ExpensePeriod, category: ExpenseCategoryFilter | null, page: number, signal: AbortSignal) {
  const params = new URLSearchParams({ period, page: String(page) });
  if (category) params.set("category", category);
  return requestPixGateway(route + "/items?" + params, expenseItemsSchema, expensesUnavailable, { signal });
}

export function saveExpenseCategory(reference: string, category: ExpenseCategory | null) {
  return requestPixGateway(route + "/items/" + encodeURIComponent(reference), expenseCategoryUpdateSchema,
    "Não foi possível salvar a categoria.", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
}
