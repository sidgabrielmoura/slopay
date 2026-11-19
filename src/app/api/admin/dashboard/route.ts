import type { NextRequest } from "next/server";
import { z } from "zod";
import { developmentFeaturesEnabled } from "@/config/development";
import { adminDashboardSchema, adminDashboardUnavailable } from "@/features/admin/admin-dashboard";
import { indicatorPeriodSchema } from "@/features/analytics/indicators";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const period = indicatorPeriodSchema.safeParse(query.get("period") ?? "30d");
  const page = z.coerce.number().int().min(1).max(10000).safeParse(query.get("page") ?? 1);
  if (!period.success || !page.success || Array.from(query.keys()).some((key) => key !== "period" && key !== "page") ||
      query.getAll("period").length > 1 || query.getAll("page").length > 1) {
    return integrationResponse({ message: "Selecione um período e uma página válidos." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/dashboard",
    output: adminDashboardSchema.refine((report) => developmentFeaturesEnabled() || report.environment === "live"),
    searchParams: new URLSearchParams({ period: period.data, page: String(page.data) }), unavailable: adminDashboardUnavailable,
  });
}
