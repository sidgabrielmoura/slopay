import { z } from "zod";

export const expenseCategories = [
  "SUPPLIERS", "OPERATIONS", "PAYROLL", "TAXES", "MARKETING", "OWN_TRANSFER", "OTHER",
] as const;
export const expenseCategorySchema = z.enum(expenseCategories);
export const expenseCategoryFilterSchema = z.enum([...expenseCategories, "UNCATEGORIZED"]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type ExpenseCategoryFilter = z.infer<typeof expenseCategoryFilterSchema>;

export const expenseCategoryPresentation = {
  SUPPLIERS: { label: "Fornecedores", color: "var(--chart-1)" },
  OPERATIONS: { label: "Despesas operacionais", color: "var(--chart-2)" },
  PAYROLL: { label: "Pessoal e folha", color: "var(--chart-4)" },
  TAXES: { label: "Impostos e tributos", color: "var(--chart-3)" },
  MARKETING: { label: "Marketing e vendas", color: "var(--destructive)" },
  OWN_TRANSFER: { label: "Transferências próprias", color: "var(--chart-5)" },
  OTHER: { label: "Outros gastos", color: "var(--chart-expense-other)" },
  UNCATEGORIZED: { label: "Sem categoria", color: "var(--muted-foreground)" },
} satisfies Record<ExpenseCategoryFilter, { label: string; color: string }>;

export const expensePeriods = ["current-month", "previous-month", "last-90-days"] as const;
export const expensePeriodSchema = z.enum(expensePeriods);
export type ExpensePeriod = z.infer<typeof expensePeriodSchema>;
export const defaultExpensePeriod: ExpensePeriod = "current-month";
export const expensePeriodLabels: Record<ExpensePeriod, string> = {
  "current-month": "Este mês",
  "previous-month": "Mês anterior",
  "last-90-days": "Últimos 90 dias",
};

const cents = z.int().nonnegative();
export const expenseSummarySchema = z.object({
  environment: z.enum(["sandbox", "live"]),
  from: z.iso.date(),
  to: z.iso.date(),
  outflowInCents: cents,
  spentInCents: cents,
  transfersInCents: cents,
  feesInCents: cents,
  count: z.int().nonnegative(),
  timeline: z.array(z.object({
    date: z.iso.date(),
    amountInCents: cents,
    spentInCents: cents,
  })).min(1).max(90),
  categories: z.array(z.object({
    category: expenseCategorySchema.nullable(),
    amountInCents: cents,
    count: z.int().positive(),
  })).max(expenseCategories.length + 1),
});
export type ExpenseSummary = z.infer<typeof expenseSummarySchema>;

export const expenseReferencePattern = /^saque-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const expenseItemSchema = z.object({
  reference: z.string().regex(expenseReferencePattern),
  category: expenseCategorySchema.nullable(),
  date: z.iso.date(),
  destination: z.string().max(80),
  amountInCents: cents,
  feeInCents: cents.nullable(),
  simulated: z.boolean(),
});
export type ExpenseItem = z.infer<typeof expenseItemSchema>;

export const expenseItemsSchema = z.object({
  data: z.array(expenseItemSchema).max(10),
  total: z.int().nonnegative(),
  page: z.int().positive(),
  totalPages: z.int().positive(),
});

export const expenseCategoryUpdateSchema = z.strictObject({ category: expenseCategorySchema.nullable() });
export const expensesUnavailable = "O controle financeiro está temporariamente indisponível. Tente novamente.";
export const financialControlPath = "/controle-financeiro";
