import { z } from "zod";
import { expenseCategorySchema } from "@/features/expenses/expenses";
import { batchStatus } from "@/features/pix-batches/live-batches";
import { pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { pixKeyTypeSchema, withdrawalSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod } from "./admin-date-period";
import { adminPaginationSchema } from "./admin-pending";

export const adminBatchesPath = "/admin/lotes";
const api = "/api/admin/pix-withdrawal-batches";
export const adminBatchesUnavailable = "Os lotes de saída estão temporariamente indisponíveis.";
export const adminBatchUnavailable = "Não foi possível consultar este lote de saída.";
export const adminBatchId = pixPaymentIdSchema.transform((value) => value.toLowerCase());

const batchState = z.enum(["QUEUED", "PROCESSING", "AWAITING_APPROVAL", "REVIEW", "DONE", "PARTIAL", "FAILED"]);
const status = z.enum(["ALL", ...batchState.options]);
const uuid = z.uuid().transform((value) => value.toLowerCase());
const datetime = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
const cents = z.int().nonnegative();
export const adminBatchPage = z.coerce.number().int().min(1).max(10_000);
export const adminBatchSearch = z.string().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u).trim();

export const adminBatchQuery = z.strictObject({
  search: adminBatchSearch.default(""), period: adminDatePeriod.default("LAST_30_DAYS"), status: status.default("ALL"),
  companyId: uuid.optional(), accountId: uuid.optional(), page: adminBatchPage.default(1),
});

const batchRow = z.object({
  id: adminBatchId, title: z.string().max(80).nullable(), createdAt: datetime, state: batchState, simulated: z.boolean(),
  company: z.string(), companyId: uuid.nullable(), accountId: uuid.nullable(), walletSuffix: z.string().max(8),
  count: count.positive(), completedCount: count, failedCount: count, reviewCount: count, pendingCount: count,
  amountInCents: cents, completedAmountInCents: cents, recordedFeesInCents: cents.nullable(), recordedFeeCount: count,
});
export const adminBatchesSchema = z.object({
  environment: z.enum(["sandbox", "live"]), items: z.array(batchRow).max(8), pagination: adminPaginationSchema,
  summary: z.object({
    amountInCents: cents, transferCount: count, completedAmountInCents: cents, completedCount: count,
    recordedFeesInCents: cents.nullable(), recordedFeeCount: count,
  }),
});

const transfer = z.object({
  id: adminBatchId, position: count.positive(),
  state: z.enum([...withdrawalSchema.shape.state.options, "AWAITING_APPROVAL", "REJECTED"]),
  pixKeyType: pixKeyTypeSchema, destination: z.string().max(80).nullable(), expenseCategory: expenseCategorySchema.nullable(),
  amountInCents: cents, feeInCents: cents.nullable(),
  effectiveAt: datetime.nullable(), effectiveDate: z.iso.date().nullable(), confirmedAt: datetime.nullable(),
});
export const adminBatchDetailSchema = z.object({
  batch: batchRow.extend({ cnpj: z.string().nullable() }),
  pagination: adminPaginationSchema, transfers: z.array(transfer).max(8),
});
export const adminBatchDetailQuery = z.strictObject({ page: adminBatchPage.default(1) });

export type AdminWithdrawalBatchQuery = z.infer<typeof adminBatchQuery>;
export type AdminWithdrawalBatch = z.infer<typeof batchRow>;
export type AdminWithdrawalBatchesReport = z.infer<typeof adminBatchesSchema>;
export type AdminWithdrawalBatchDetail = z.infer<typeof adminBatchDetailSchema>;
export type AdminBatchTransfer = z.infer<typeof transfer>;

export const adminBatchStatuses = {
  ...batchStatus, AWAITING_APPROVAL: { label: "Aguardando titular", variant: "warning" },
} as const;

export function adminBatchQueryFrom(params: Pick<URLSearchParams, "get">): AdminWithdrawalBatchQuery {
  return {
    search: adminBatchSearch.catch("").parse(params.get("search")), status: status.catch("ALL").parse(params.get("status")),
    period: adminDatePeriod.catch("LAST_30_DAYS").parse(params.get("period")), page: adminBatchPage.catch(1).parse(params.get("page")),
    companyId: uuid.safeParse(params.get("companyId")).data, accountId: uuid.safeParse(params.get("accountId")).data,
  };
}

export function adminBatchParams(query: AdminWithdrawalBatchQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.period !== "LAST_30_DAYS") params.set("period", query.period);
  if (query.companyId) params.set("companyId", query.companyId);
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function adminBatchHref(query: AdminWithdrawalBatchQuery, id?: string, itemPage = 1) {
  const params = adminBatchParams(query);
  if (id && itemPage > 1) params.set("itemPage", String(itemPage));
  return adminBatchesPath + (id ? "/" + id : "") + (params.size ? "?" + params : "");
}

export const adminWithdrawalBatches = {
  list: (query: AdminWithdrawalBatchQuery, signal: AbortSignal) =>
    requestPixGateway(api + "?" + adminBatchParams(query), adminBatchesSchema, adminBatchesUnavailable, { signal }),
  detail: (id: string, page: number, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}?page=${page}`, adminBatchDetailSchema, adminBatchUnavailable, { signal }),
};
