import { z } from "zod";
import { pixPaymentIdSchema, pixQrCodeSchema } from "@/features/pix-receive/pix-receipt";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod } from "./admin-date-period";
import { adminPaginationSchema } from "./admin-pending";

export const adminPixChargesPath = "/admin/cobrancas";
const api = "/api/admin/pix-charges";
export const adminChargesUnavailable = "As cobranças Pix estão temporariamente indisponíveis.";
export const adminChargeUnavailable = "Não foi possível consultar esta cobrança Pix.";
export const adminQrUnavailable = "Não foi possível consultar os dados do Pix.";
export const adminChargeId = pixPaymentIdSchema.transform((value) => value.toLowerCase());

const chargeStatus = z.enum(["PENDING", "OVERDUE", "PROCESSING", "COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "REVIEW", "FAILED", "CANCELLED"]);
const statusFilter = z.enum(["ALL", ...chargeStatus.options]);
const uuid = z.uuid().transform((value) => value.toLowerCase());
const dateTime = z.iso.datetime({ offset: true });
const cents = z.int().nonnegative();
const page = z.coerce.number().int().min(1).max(10_000);
export const adminChargeSearch = z.string().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u).trim();

export const adminChargeQuery = z.strictObject({
  search: adminChargeSearch.default(""), status: statusFilter.default("ALL"), period: adminDatePeriod.default("LAST_30_DAYS"),
  accountId: uuid.optional(), companyId: uuid.optional(), page: page.default(1),
});
const row = z.object({
  id: adminChargeId, status: chargeStatus, company: z.string(), companyId: uuid.nullable(), accountId: uuid.nullable(),
  walletSuffix: z.string().max(8), description: z.string().nullable(), amountInCents: cents,
  createdAt: dateTime, dueDate: z.iso.date(),
});
export const adminPixChargesSchema = z.object({
  environment: z.literal("sandbox"), items: z.array(row).max(8),
  pagination: adminPaginationSchema,
  summary: z.object({
    registeredCents: cents, outstandingCents: cents, outstandingCount: z.int().nonnegative(),
    receivedCents: cents, receivedCount: z.int().nonnegative(), reviewCents: cents, reviewCount: z.int().nonnegative(),
  }),
});
export const adminPixChargeSchema = row.extend({
  cnpj: z.string().nullable(), providerReference: z.string().max(64).nullable(), qrAvailable: z.boolean(),
  netInCents: cents.nullable(), feeInCents: cents.nullable(), refundedInCents: cents, refundPending: z.boolean(),
  paidAt: dateTime.nullable(), paidDate: z.iso.date().nullable(), recordedAt: dateTime.nullable(),
});
export const adminPixChargeQrSchema = pixQrCodeSchema.extend({ expiresAt: z.iso.datetime() });

export type AdminChargeQuery = z.infer<typeof adminChargeQuery>;
export type AdminChargeRow = z.infer<typeof row>;
export type AdminCharge = z.infer<typeof adminPixChargeSchema>;
export type AdminChargesReport = z.infer<typeof adminPixChargesSchema>;
export type AdminChargeStatus = z.infer<typeof chargeStatus>;

export const adminChargeStatusLabels: Record<AdminChargeStatus, string> = {
  PENDING: "Em aberto", OVERDUE: "Vencida", PROCESSING: "Em emissão", COMPLETED: "Paga",
  PARTIALLY_REFUNDED: "Estorno parcial", REFUNDED: "Estornada", REVIEW: "Em revisão", FAILED: "Falhou", CANCELLED: "Cancelada",
};

export function adminChargeQueryFrom(params: Pick<URLSearchParams, "get">): AdminChargeQuery {
  return {
    search: adminChargeSearch.catch("").parse(params.get("search")), status: statusFilter.catch("ALL").parse(params.get("status")),
    period: adminDatePeriod.catch("LAST_30_DAYS").parse(params.get("period")), page: page.catch(1).parse(params.get("page")),
    companyId: uuid.safeParse(params.get("companyId")).data, accountId: uuid.safeParse(params.get("accountId")).data,
  };
}

export function adminChargeParams(query: AdminChargeQuery, id?: string) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.period !== "LAST_30_DAYS") params.set("period", query.period);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.companyId) params.set("companyId", query.companyId);
  if (query.accountId) params.set("accountId", query.accountId);
  if (query.page > 1) params.set("page", String(query.page));
  if (id) params.set("cobranca", id);
  return params.size ? "?" + params : "";
}

export const adminPixCharges = {
  list: (query: AdminChargeQuery, signal: AbortSignal) =>
    requestPixGateway(api + adminChargeParams(query), adminPixChargesSchema, adminChargesUnavailable, { signal }),
  detail: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}`, adminPixChargeSchema, adminChargeUnavailable, { signal }),
  qrCode: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}/qr-code`, adminPixChargeQrSchema, adminQrUnavailable, { signal, timeoutMs: 28_000 }),
};
