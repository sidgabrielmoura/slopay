import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminPaginationSchema } from "./admin-pending";
import { pixQueryFrom, pixQueryString, pixTransactionKind, pixTransactionQuery } from "./admin-pix-transactions";

const api = "/api/admin/global-statement";
export const globalStatementUnavailable = "O Extrato Global está temporariamente indisponível.";
const entryType = z.enum(["CREDIT", "DEBIT", "FEE_DEBIT"]);
export const statementTypeFilter = z.enum(["ALL", ...entryType.options]);
export const globalStatementQuery = pixTransactionQuery.omit({ type: true, status: true }).extend({
  type: statementTypeFilter.default("ALL"),
});

const row = z.object({
  transactionId: z.uuid(), kind: pixTransactionKind, type: entryType, company: z.string(),
  companyId: z.uuid().nullable(), accountId: z.uuid().nullable(), walletSuffix: z.string().max(8),
  occurredAt: z.iso.datetime({ offset: true }), dateOnly: z.boolean(), dateSource: z.enum(["SETTLED", "RECORDED"]),
  amountInCents: z.int(),
}).refine(({ type, amountInCents }) => type === "CREDIT" ? amountInCents > 0 : amountInCents < 0);
const positiveCents = z.int().nonnegative();
export const globalStatementReport = z.object({
  environment: z.enum(["sandbox", "live"]), items: z.array(row).max(8), pagination: adminPaginationSchema,
  summary: z.object({ creditCents: positiveCents, debitCents: positiveCents, feeCents: positiveCents, netCents: z.int() }),
});

export type GlobalStatementQuery = z.infer<typeof globalStatementQuery>;
export type GlobalStatementReport = z.infer<typeof globalStatementReport>;
export type GlobalStatementEntry = z.infer<typeof row>;

export const statementTypeLabels = {
  CREDIT: "Crédito", DEBIT: "Débito", FEE_DEBIT: "Tarifa",
} as const;

export function globalStatementQueryFrom(params: Pick<URLSearchParams, "get">): GlobalStatementQuery {
  const { page, period, search, companyId, accountId } = pixQueryFrom(params);
  return { page, period, search, companyId, accountId, type: statementTypeFilter.catch("ALL").parse(params.get("type")) };
}

export function globalStatementParams(query: GlobalStatementQuery) {
  const params = new URLSearchParams(pixQueryString({ ...query, type: "ALL", status: "ALL" }));
  if (query.type !== "ALL") params.set("type", query.type);
  return params;
}

export function exportGlobalStatement(query: GlobalStatementQuery) {
  return requestPixGateway(api, globalStatementReport, globalStatementUnavailable, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(globalStatementQuery.parse(query)),
  });
}

export function fetchGlobalStatement(query: GlobalStatementQuery, signal?: AbortSignal) {
  const params = globalStatementParams(query);
  return requestPixGateway(api + (params.size ? "?" + params : ""), globalStatementReport, globalStatementUnavailable, { signal });
}
