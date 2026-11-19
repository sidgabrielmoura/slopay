import { z } from "zod";
import { pixFeesSchema } from "@/features/account/pix-conditions";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { operationalAccountItemSchema, operationalPage, operationalSearch } from "./admin-operational-accounts";
import { adminPaginationSchema } from "./admin-pending";

export const adminPixFeesPath = "/admin/taxas-e-limites";
export const adminPixFeesUnavailable = "Não foi possível consultar as tarifas Pix.";
export const adminPixFeeRefreshUnavailable = "Não foi possível atualizar as tarifas no Asaas.";
const api = "/api/admin/pix-fees";

export const pixFeeCoverage = z.enum(["ALL", "RECORDED", "MISSING"]);
export const adminPixFeesQuery = z.strictObject({
  coverage: pixFeeCoverage.default("ALL"),
  search: operationalSearch.default(""),
  page: operationalPage.default(1),
});

const wallet = operationalAccountItemSchema.pick({ id: true, companyName: true, cnpj: true, walletSuffix: true }).extend({
  fees: pixFeesSchema.nullable(),
  checkedAt: z.iso.datetime({ offset: true }).nullable(),
});
export const adminPixFeeDetail = wallet.extend({
  status: operationalAccountItemSchema.shape.status,
  canRefresh: z.boolean(),
  withdrawalsConfigured: z.boolean(),
});
export const adminPixFeesList = z.object({
  summary: z.object({ total: z.int().nonnegative(), checked: z.int().nonnegative() }),
  limits: z.object({
    minimumChargeInCents: z.int().positive(),
    pilotBatchLimits: z.object({ minimum: z.int().positive(), maximum: z.int().positive() }).nullable(),
  }),
  pagination: adminPaginationSchema,
  items: z.array(wallet).max(8),
});
export type PixFeesQuery = z.infer<typeof adminPixFeesQuery>;
export type PixFeeWallet = z.infer<typeof wallet>;
export type PixFeeLimits = z.infer<typeof adminPixFeesList>["limits"];

export function pixFeesQueryFrom(params: Pick<URLSearchParams, "get">): PixFeesQuery {
  return {
    coverage: pixFeeCoverage.catch("ALL").parse(params.get("coverage")),
    search: operationalSearch.catch("").parse(params.get("search")),
    page: operationalPage.catch(1).parse(params.get("page")),
  };
}

export function pixFeesParams(query: PixFeesQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.coverage !== "ALL") params.set("coverage", query.coverage);
  if (query.page > 1) params.set("page", String(query.page));
  return params.size ? "?" + params : "";
}

export const adminPixFeesListKey = (userId: string) => ["admin-pix-fees", userId] as const;
export const adminPixFeeDetailKey = (userId: string, id: string) => ["admin-pix-fee-account", userId, id] as const;

export const adminPixFees = {
  list: (query: PixFeesQuery, signal: AbortSignal) =>
    requestPixGateway(api + pixFeesParams(query), adminPixFeesList, adminPixFeesUnavailable, { signal }),
  detail: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}`, adminPixFeeDetail, adminPixFeesUnavailable, { signal }),
  refresh: (id: string) =>
    requestPixGateway(`${api}/${id}/refresh`, adminPixFeeDetail, adminPixFeeRefreshUnavailable, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", timeoutMs: 16_000,
    }),
};
