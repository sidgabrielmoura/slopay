import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod as period } from "./admin-date-period";
import { adminPaginationSchema } from "./admin-pending";
import { movementBalance } from "./admin-movement-balance";
import { movementOrigin } from "./admin-movement-origin";
import { adminPixPayer } from "./admin-pix-payer";
import { movementScope, movementScopeFrom, setMovementScope } from "./admin-movement-filters";

export const pixTransactionsPath = "/admin/operacoes";
const api = "/api/admin/pix-transactions";
export const pixTransactionsUnavailable = "As transações Pix estão temporariamente indisponíveis.";
export const pixTransactionUnavailable = "Os detalhes desta transação estão temporariamente indisponíveis.";

export const pixTransactionKind = z.enum(["RECEIVE", "WITHDRAW", "BATCH", "REFUND"]);
const status = z.enum([
  "COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "PENDING", "PROCESSING", "AWAITING_APPROVAL",
  "REVIEW", "BLOCKED", "FAILED", "REJECTED", "CANCELLED",
]);
const date = z.iso.datetime({ offset: true });
const cents = z.int().nonnegative();
const uid = z.uuid().transform((value) => value.toLowerCase());
const typeFilter = z.enum(["ALL", ...pixTransactionKind.options]);
const statusFilter = z.enum(["ALL", ...status.options]);
const pageNumber = z.coerce.number().int().min(1).max(10_000);
export const pixTransactionSearch = z.string().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u).trim();

export const pixTransactionQuery = z.strictObject({
  ...movementScope,
  type: typeFilter.default("ALL"), status: statusFilter.default("ALL"), period: period.default("LAST_30_DAYS"),
  companyId: uid.optional(), accountId: uid.optional(), search: pixTransactionSearch.default(""), page: pageNumber.default(1),
});
export const pixTransactionIdentifier = z.object({ kind: pixTransactionKind, id: uid });

const row = pixTransactionIdentifier.extend({
  status, company: z.string(), companyId: uid.nullable(), accountId: uid.nullable(), walletSuffix: z.string().max(8),
  amountInCents: cents, feeInCents: cents.nullable(), occurredAt: date, dateOnly: z.boolean(),
  dateSource: z.enum(["CREATED", "SETTLED", "RECORDED"]), simulated: z.boolean(),
  balance: movementBalance.nullish(),
  origin: movementOrigin,
});
export const pixTransactionsReport = z.object({
  environment: z.enum(["sandbox", "live"]),
  items: z.array(row).max(8), pagination: adminPaginationSchema,
  summary: z.object({
    receivedCents: cents, receivedCount: z.int().nonnegative(), withdrawnCents: cents, withdrawnCount: z.int().nonnegative(),
    refundedCents: cents, refundedCount: z.int().nonnegative(), feeCents: cents.nullable(), feeCount: z.int().nonnegative(),
  }),
});
export const pixTransactionDetail = row.extend({
  payer: adminPixPayer.nullish(),
  createdAt: date, cnpj: z.string().nullable(), description: z.string().nullable(),
  providerReference: z.string().max(64).nullable(), endToEndId: z.string().max(32).nullable(),
  destination: z.string().max(80).nullable(), pixKeyType: z.string().max(5).nullable(),
  batchId: uid.nullable(), batchPosition: z.int().nonnegative().nullable(), originalId: uid.nullable(), requestedAt: date.nullable(),
  netInCents: cents.nullable(), refundedInCents: cents.nullable(), refundPending: z.boolean(),
});

export type PixTransactionsQuery = z.infer<typeof pixTransactionQuery>;
export type PixTransactionRow = z.infer<typeof row>;
export type PixTransactionDetail = z.infer<typeof pixTransactionDetail>;
export type PixTransactionId = z.infer<typeof pixTransactionIdentifier>;
export type PixTransactionsReport = z.infer<typeof pixTransactionsReport>;

export const pixKindLabels: Record<PixTransactionId["kind"], string> = {
  RECEIVE: "Recebimento Pix", WITHDRAW: "Saque Pix", BATCH: "Item de lote", REFUND: "Estorno Pix",
};
export const pixStatusLabels: Record<PixTransactionRow["status"], string> = {
  COMPLETED: "Concluída", PARTIALLY_REFUNDED: "Estorno parcial", REFUNDED: "Estornada",
  PENDING: "Aguardando pagamento", PROCESSING: "Em processamento", AWAITING_APPROVAL: "Aguardando titular",
  REVIEW: "Em revisão", BLOCKED: "Bloqueada", FAILED: "Falhou", REJECTED: "Recusada pelo titular", CANCELLED: "Cancelada",
};
export function pixQueryFrom(params: Pick<URLSearchParams, "get">): PixTransactionsQuery {
  return {
    ...movementScopeFrom(params),
    type: typeFilter.catch("ALL").parse(params.get("type")), status: statusFilter.catch("ALL").parse(params.get("status")),
    period: period.catch("LAST_30_DAYS").parse(params.get("period")), page: pageNumber.catch(1).parse(params.get("page")),
    search: pixTransactionSearch.catch("").parse(params.get("search")),
    companyId: uid.optional().catch(undefined).parse(params.get("companyId") ?? undefined),
    accountId: uid.optional().catch(undefined).parse(params.get("accountId") ?? undefined),
  };
}

export function pixQueryString(query: PixTransactionsQuery, detail?: PixTransactionId) {
  const params = new URLSearchParams();
  setMovementScope(params, query);
  if (query.search) params.set("search", query.search);
  if (query.period !== "LAST_30_DAYS") params.set("period", query.period);
  if (query.type !== "ALL") params.set("type", query.type);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.companyId) params.set("companyId", query.companyId);
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.page > 1) params.set("page", String(query.page));
  if (detail) {
    params.set("detail", detail.kind);
    params.set("transaction", detail.id);
  }
  return params.size ? "?" + params : "";
}

export const adminPixTransactions = {
  list: (query: PixTransactionsQuery, signal?: AbortSignal) =>
    requestPixGateway(api + pixQueryString(query), pixTransactionsReport, pixTransactionsUnavailable, { signal }),
  export: (query: PixTransactionsQuery) =>
    requestPixGateway(api, pixTransactionsReport, pixTransactionsUnavailable, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pixTransactionQuery.parse(query)),
    }),
  detail: ({ kind, id }: PixTransactionId, signal: AbortSignal) =>
    requestPixGateway(`${api}/${kind}/${id}`, pixTransactionDetail, pixTransactionUnavailable, { signal }),
};
