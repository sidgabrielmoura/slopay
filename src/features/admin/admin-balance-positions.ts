import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import {
  operationalAccountItemSchema, operationalParams, operationalQueryFrom, operationalQuerySchema,
} from "./admin-operational-accounts";
import { adminPaginationSchema } from "./admin-pending";

export const balancePositionsPath = "/admin/saldos";
export type WalletView = "saldos" | "roteamento" | "vinculos" | "bolsao" | "validacao";

export function walletsHref(view: WalletView, search?: URLSearchParams) {
  const params = new URLSearchParams(search);
  params.delete("aba");
  if (view !== "saldos") params.set("aba", view);
  return balancePositionsPath + (params.size ? "?" + params : "");
}
const api = "/api/admin/balance-positions";
export const balancePositionsUnavailable = "Não foi possível consultar os saldos das carteiras.";
export const balancePositionsQueryKey = (adminId: string) => ["admin-balance-positions", adminId] as const;
export const balanceCoverage = z.enum(["ALL", "RECORDED", "MISSING"]);
export const balancePositionsQuery = operationalQuerySchema.extend({ coverage: balanceCoverage.default("ALL") });

const count = z.int().nonnegative();
const openWithdrawals = z.object({
  count, amountInCents: z.string().regex(/^\d+$/),
});
const item = operationalAccountItemSchema.extend({ openWithdrawals });
export const balancePositionsReport = z.object({
  environment: z.literal("sandbox"), items: z.array(item).max(8), pagination: adminPaginationSchema,
  summary: z.object({
    accountCount: count, recordedCount: count,
    balanceInCents: z.string().regex(/^-?\d+$/).nullable(), oldestBalanceCheckedAt: z.iso.datetime({ offset: true }).nullable(),
    openWithdrawals,
  }),
});

export type BalancePositionsQuery = z.infer<typeof balancePositionsQuery>;
export type BalancePositionsReport = z.infer<typeof balancePositionsReport>;
export type BalancePosition = z.infer<typeof item>;

export function balancePositionsQueryFrom(params: Pick<URLSearchParams, "get">): BalancePositionsQuery {
  return { ...operationalQueryFrom(params), coverage: balanceCoverage.catch("ALL").parse(params.get("coverage")) };
}

export function balancePositionsParams(query: BalancePositionsQuery) {
  const params = new URLSearchParams(operationalParams(query));
  if (query.coverage !== "ALL") params.set("coverage", query.coverage);
  return params;
}

export function balancePositionsHref(query: BalancePositionsQuery) {
  const params = balancePositionsParams(query);
  return balancePositionsPath + (params.size ? "?" + params : "");
}

export function fetchBalancePositions(query: BalancePositionsQuery, signal: AbortSignal) {
  const params = balancePositionsParams(query);
  return requestPixGateway(api + (params.size ? "?" + params : ""), balancePositionsReport, balancePositionsUnavailable, { signal });
}
