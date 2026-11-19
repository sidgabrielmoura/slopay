import "server-only";

import { developmentFeaturesEnabled } from "@/config/development";

import { cookies } from "next/headers";
import { z } from "zod";
import { pixReceiptDatesSchema } from "@/features/pix-receive/pix-receipt";
import { liveTransactionDetailSchema } from "@/features/transactions/live-transactions";
import { requestBackend } from "./auth-backend";
import { accessCookie } from "./session";

const environmentSchema = z.enum(["sandbox", "live"]);
const operationSchema = z.object({
  reference: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/),
  description: z.string().min(1).max(500),
  amountInCents: z.int().positive(),
  createdAt: z.iso.datetime(),
  status: z.enum(["SAMPLE", "PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"]),
});
const summarySchema = z.object({
  environment: environmentSchema,
  operationsCount: z.int().nonnegative(),
  totalAmountInCents: z.int().nonnegative(),
  recentOperations: z.array(operationSchema).max(10),
});
const detailSchema = z.object({
  environment: environmentSchema,
  operation: operationSchema.extend({ receipt: pixReceiptDatesSchema.nullish() }),
});
const overviewSchema = z.object({
  environment: environmentSchema,
  pixReceiveAvailable: z.boolean().default(false),
  pixWithdrawAvailable: z.boolean().default(false),
  days: z.array(z.object({
    date: z.iso.date(),
    count: z.int().nonnegative(),
    amountInCents: z.int().nonnegative(),
    outflowsCount: z.int().nonnegative().optional(),
    outflowsInCents: z.int().nonnegative().optional(),
  })).min(7).max(184),
  recentOperations: z.array(operationSchema).max(6),
});

export type DashboardSummary = z.infer<typeof summarySchema>;
export type DashboardOperation = z.infer<typeof operationSchema>;
export type DashboardOverview = z.infer<typeof overviewSchema>;

async function loadDashboardData<T>(path: `/dashboard/${string}`, schema: z.ZodType<T>) {
  const accessToken = (await cookies()).get(accessCookie)?.value;
  if (!accessToken) return { state: "unavailable" } as const;
  try {
    const response = await requestBackend(path, { method: "GET", accessToken });
    if (response.status === 404) return { state: "absent" } as const;
    if (!response.ok) return { state: "unavailable" } as const;

    const result = schema.safeParse(await response.json());
    return result.success
      ? { state: "ready", data: result.data } as const
      : { state: "unavailable" } as const;
  } catch {
    return { state: "unavailable" } as const;
  }
}

export async function loadDashboardSummary() {
  const result = await loadDashboardData("/dashboard/summary", summarySchema);
  return result.state === "ready" ? result.data : null;
}

export async function loadDashboardOverview() {
  const result = await loadDashboardData("/dashboard/overview", overviewSchema);
  return result.state === "ready" && (developmentFeaturesEnabled() || result.data.environment === "live") ? result.data : null;
}

export function loadDashboardOperation(reference: string) {
  return loadDashboardData(`/dashboard/operations/${encodeURIComponent(reference)}`, detailSchema);
}

export function loadDashboardTransaction(reference: string) {
  return loadDashboardData(`/dashboard/transactions/${encodeURIComponent(reference)}`, liveTransactionDetailSchema);
}
