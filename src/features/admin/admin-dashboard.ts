import { z } from "zod";
import { indicatorDaySchema, indicatorPeriodSchema } from "@/features/analytics/indicators";
import { ApiError } from "@/lib/api-client";

const nonnegative = z.int().nonnegative();
export const adminDashboardUnavailable = "A visão geral está temporariamente indisponível.";
const sandboxDashboardSchema = z.object({
  environment: z.literal("sandbox"),
  period: indicatorPeriodSchema,
  generatedAt: z.iso.datetime({ offset: true }),
  firstDay: z.iso.date(),
  lastDay: z.iso.date(),
  receivedCents: nonnegative,
  receivedCount: nonnegative,
  withdrawnCents: nonnegative,
  withdrawnCount: nonnegative,
  refundedCents: nonnegative,
  refundedCount: nonnegative,
  companiesCount: nonnegative,
  linkedCompaniesCount: nonnegative,
  pagination: z.object({ page: z.int().min(1).max(10000), pageSize: z.literal(8), total: nonnegative }),
  pending: z.object({
    charges: nonnegative,
    chargeReview: nonnegative,
    withdrawalApprovals: nonnegative,
    withdrawalReview: nonnegative,
    withdrawals: nonnegative,
  }),
  days: z.array(indicatorDaySchema).min(7).max(90),
  companies: z.array(z.object({ id: z.string(), name: z.string(), registered: z.boolean(), volumeCents: nonnegative })).max(5),
  recentOperations: z.array(z.object({
    id: z.string(),
    kind: z.enum(["RECEIVE", "WITHDRAW", "REFUND"]),
    company: z.string(),
    description: z.string(),
    amountInCents: nonnegative,
    status: z.enum(["COMPLETED", "PENDING", "PROCESSING", "AWAITING_APPROVAL", "REVIEW", "FAILED", "CANCELLED"]),
    createdAt: z.iso.datetime({ offset: true }),
    occurredAt: z.iso.datetime({ offset: true }),
  })).max(8),
});

export const adminDashboardSchema = z.discriminatedUnion("environment", [
  sandboxDashboardSchema,
  z.object({ environment: z.literal("live"), companiesCount: nonnegative, generatedAt: z.iso.datetime({ offset: true }) }),
]);

export type AdminDashboardReport = z.infer<typeof adminDashboardSchema>;
type SandboxDashboardReport = z.infer<typeof sandboxDashboardSchema>;
export type AdminDashboardOperation = SandboxDashboardReport["recentOperations"][number];

export async function fetchAdminDashboard(period: SandboxDashboardReport["period"], page: number, signal: AbortSignal) {
  const response = await fetch(`/api/admin/dashboard?period=${period}&page=${page}`, { signal, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.message ?? adminDashboardUnavailable, response.status);
  const result = adminDashboardSchema.safeParse(body);
  if (!result.success || (result.data.environment === "sandbox" && result.data.period !== period)) throw new ApiError(adminDashboardUnavailable, 503);
  return result.data;
}

export function adminPendingCount(pending: SandboxDashboardReport["pending"]) {
  return pending.charges + pending.chargeReview + pending.withdrawalApprovals + pending.withdrawalReview + pending.withdrawals;
}
