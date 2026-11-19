import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";

export const liveTransactionStatuses = ["PENDING", "PROCESSING", "COMPLETED", "REVIEW", "BLOCKED", "FAILED", "CANCELLED"] as const;
export const transactionReferencePattern = /^[A-Za-z0-9_-]{1,64}$/;
export const transactionSearchLimit = 120;
export const statementUnavailableMessage = "O extrato está temporariamente indisponível. Tente novamente.";

export const liveTransactionFilterSchema = z.object({
  direction: z.enum(["IN", "OUT"]).optional(),
  status: z.enum(liveTransactionStatuses).optional(),
  search: z.string().max(transactionSearchLimit).refine((value) => !value.includes("\0")).optional(),
  page: z.string().regex(/^[1-9]\d{0,8}$/).optional(),
});

export const statementExportRequest = liveTransactionFilterSchema.omit({ page: true }).extend({
  fromDate: z.iso.date(),
  throughDate: z.iso.date(),
}).refine(({ fromDate, throughDate }) => {
  const interval = Date.parse(throughDate) - Date.parse(fromDate);
  return interval >= 0 && interval < 366 * 86_400_000;
});
export const statementExportResult = z.object({
  csv: z.string().min(1).max(8_388_608), rowCount: z.int().min(0).max(10_000),
});

const environmentSchema = z.enum(["sandbox", "live"]);
const transactionSchema = z.object({
  id: z.string(),
  reference: z.string().regex(transactionReferencePattern),
  direction: z.enum(["IN", "OUT"]),
  status: z.enum(liveTransactionStatuses),
  description: z.string().min(1),
  providerId: z.string().nullable(),
  destination: z.string().nullable(),
  amountInCents: z.int().positive(),
  netInCents: z.int().nonnegative().nullable(),
  feeInCents: z.int().nonnegative().nullable(),
  createdAt: z.iso.datetime(),
  settledAt: z.iso.datetime().nullable(),
  settledDate: z.iso.date().nullable(),
  recordedAt: z.iso.datetime().nullable(),
  simulated: z.boolean(),
  refundedInCents: z.int().nonnegative().nullable().optional(),
  refundPending: z.boolean().optional(),
});

export const liveTransactionsSchema = z.object({
  environment: environmentSchema,
  data: z.array(transactionSchema).max(10),
  total: z.int().nonnegative(),
  page: z.int().positive(),
  totalPages: z.int().positive(),
  totalInflowInCents: z.int().nonnegative(),
  totalOutflowInCents: z.int().nonnegative(),
  totalFeesInCents: z.int().nonnegative(),
});

export const liveTransactionDetailSchema = z.object({
  environment: environmentSchema,
  operation: transactionSchema,
});

export type LiveTransaction = z.infer<typeof transactionSchema>;
export type LiveTransactionDetail = z.infer<typeof liveTransactionDetailSchema>;

export function fetchLiveTransactions(filters: {
  direction?: "IN" | "OUT";
  status?: string;
  search?: string;
  page?: number;
}, signal: AbortSignal) {
  const query = new URLSearchParams({ page: String(filters.page ?? 1) });
  if (filters.direction) query.set("direction", filters.direction);
  if (filters.status) query.set("status", filters.status);
  if (filters.search) query.set("search", filters.search);
  return requestPixGateway("/api/dashboard/transactions?" + query, liveTransactionsSchema, statementUnavailableMessage, { signal });
}
