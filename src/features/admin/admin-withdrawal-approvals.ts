import { z } from "zod";
import { pixPaymentIdSchema } from "@/features/pix-receive/pix-receipt";
import { pixKeyTypeSchema } from "@/features/pix-withdraw/pix-withdrawal";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { adminDatePeriod } from "./admin-date-period";
import { adminPaginationSchema } from "./admin-pending";

export const adminApprovalsPath = "/admin/aprovacoes-financeiras";
const api = "/api/admin/withdrawal-approvals";
export const adminApprovalsUnavailable = "As solicitações de aprovação estão temporariamente indisponíveis.";
export const adminApprovalUnavailable = "Não foi possível consultar esta solicitação de aprovação.";
export const adminApprovalId = pixPaymentIdSchema.transform((value) => value.toLowerCase());
export const adminApprovalSearch = z.string().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u).trim();

const decisions = z.enum(["PENDING", "APPROVED", "REJECTED", "CLOSED"]);
const executions = z.enum(["AWAITING_APPROVAL", "COMPLETED", "PROCESSING", "REVIEW", "BLOCKED", "FAILED", "REJECTED", "CANCELLED"]);
const status = z.enum(["ALL", ...decisions.options]);
const pageNumber = z.coerce.number().int().min(1).max(10_000);
const date = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
const cents = z.int().nonnegative();

export const adminApprovalQuery = z.strictObject({
  search: adminApprovalSearch.default(""), status: status.default("PENDING"),
  period: adminDatePeriod.default("ALL"), page: pageNumber.default(1),
});

const row = z.object({
  id: adminApprovalId, company: z.string(), ownerName: z.string(),
  amountInCents: cents, decision: decisions, execution: executions, requestedAt: date,
});

export const adminApprovalsSchema = z.object({
  environment: z.literal("sandbox"), items: z.array(row).max(8), pagination: adminPaginationSchema,
  summary: z.object({ pendingCount: count, pendingCents: cents, approvedCount: count, rejectedCount: count, closedCount: count }),
});

export const adminApprovalDetailSchema = row.extend({
  companyId: z.uuid(), cnpj: z.string().nullable(), accountId: z.uuid(), walletSuffix: z.string().max(8),
  destination: z.string().max(9).nullable(), pixKeyType: pixKeyTypeSchema,
  authorizedAt: date.nullable(), updatedAt: date, confirmedAt: date.nullable(), effectiveAt: date.nullable(),
  effectiveDate: z.iso.date().nullable(), approvedFeeLimitInCents: cents.nullable(), feeInCents: cents.nullable(),
});

export type AdminApprovalQuery = z.infer<typeof adminApprovalQuery>;
export type AdminWithdrawalApproval = z.infer<typeof row>;
export type AdminApprovalSummary = z.infer<typeof adminApprovalsSchema>["summary"];
export type AdminApprovalDetail = z.infer<typeof adminApprovalDetailSchema>;

export const approvalStates = {
  PENDING: { label: "Aguardando titular", variant: "warning" },
  APPROVED: { label: "Autorizada", variant: "success" },
  REJECTED: { label: "Recusada pelo titular", variant: "destructive" },
  CLOSED: { label: "Encerrada sem decisão", variant: "secondary" },
} as const;

export function adminApprovalQueryFrom(params: Pick<URLSearchParams, "get">): AdminApprovalQuery {
  return {
    search: adminApprovalSearch.catch("").parse(params.get("search")),
    status: status.catch("PENDING").parse(params.get("status")),
    period: adminDatePeriod.catch("ALL").parse(params.get("period")),
    page: pageNumber.catch(1).parse(params.get("page")),
  };
}

export function adminApprovalParams(query: AdminApprovalQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== "PENDING") params.set("status", query.status);
  if (query.period !== "ALL") params.set("period", query.period);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function adminApprovalHref(query: AdminApprovalQuery, id?: string) {
  const params = adminApprovalParams(query);
  return adminApprovalsPath + (id ? "/" + id : "") + (params.size ? "?" + params : "");
}

export const adminWithdrawalApprovals = {
  list: (query: AdminApprovalQuery, signal: AbortSignal) =>
    requestPixGateway(api + "?" + adminApprovalParams(query), adminApprovalsSchema, adminApprovalsUnavailable, { signal }),
  detail: (id: string, signal: AbortSignal) =>
    requestPixGateway(`${api}/${id}`, adminApprovalDetailSchema, adminApprovalUnavailable, { signal }),
};
