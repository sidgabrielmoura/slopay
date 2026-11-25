import { z } from "zod";
import { adminChargeId, adminChargeParams, adminChargeQueryFrom, adminPixCharges, type AdminChargeQuery } from "./admin-pix-charges";
import { fetchGlobalStatement, globalStatementParams, globalStatementQueryFrom, type GlobalStatementQuery } from "./admin-global-statement";
import {
  adminPixTransactions, pixQueryFrom, pixQueryString, pixTransactionIdentifier, pixTransactionsPath,
  type PixTransactionId, type PixTransactionsQuery,
} from "./admin-pix-transactions";

export const pixMovementView = z.enum(["all", "charges", "statement"]);
export type PixMovementView = z.infer<typeof pixMovementView>;
export type PixMovementQuery =
  | (PixTransactionsQuery & { view: "all" })
  | (AdminChargeQuery & { view: "charges" })
  | (GlobalStatementQuery & { view: "statement" });

type SearchParams = Pick<URLSearchParams, "get">;

export function pixMovementQueryFrom(params: SearchParams): PixMovementQuery {
  const view = pixMovementView.catch("all").parse(params.get("view"));
  if (view === "charges") return { ...adminChargeQueryFrom(params), view };
  if (view === "statement") return { ...globalStatementQueryFrom(params), view };
  return { ...pixQueryFrom(params), view };
}

export function pixMovementSelection(params: SearchParams): PixTransactionId | undefined {
  const detail = pixTransactionIdentifier.safeParse({ kind: params.get("detail"), id: params.get("transaction") });
  if (detail.success) return detail.data;
  const charge = adminChargeId.safeParse(params.get("cobranca"));
  if (params.get("view") === "charges" && charge.success) return { kind: "RECEIVE", id: charge.data };
}

export function pixMovementHref(query: PixMovementQuery, detail?: PixTransactionId) {
  if (query.view === "all") return pixTransactionsPath + pixQueryString(query, detail);
  const params = query.view === "charges" ? new URLSearchParams(adminChargeParams(query)) : globalStatementParams(query);
  params.set("view", query.view);
  if (detail) {
    params.set("detail", detail.kind);
    params.set("transaction", detail.id);
  }
  return pixTransactionsPath + "?" + params;
}

export function pixMovementViewQuery(view: PixMovementView, query: PixMovementQuery): PixMovementQuery {
  const { search, period, companyId, accountId } = query;
  const shared = { search, period, companyId, accountId, page: 1 };
  if (view === "charges") return { ...shared, view, status: "ALL" };
  if (view === "statement") return { ...shared, view, type: "ALL" };
  return { ...shared, view, status: "ALL", type: "ALL" };
}

export async function fetchPixMovements(query: PixMovementQuery, signal: AbortSignal) {
  if (query.view === "charges") return { ...await adminPixCharges.list(query, signal), view: query.view };
  if (query.view === "statement") return { ...await fetchGlobalStatement(query, signal), view: query.view };
  return { ...await adminPixTransactions.list(query, signal), view: query.view };
}

export type PixMovementReport = Awaited<ReturnType<typeof fetchPixMovements>>;
