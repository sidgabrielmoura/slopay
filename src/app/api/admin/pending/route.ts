import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminPendingSchema, adminPendingUnavailable, pendingCategorySchema } from "@/features/admin/admin-pending";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const category = pendingCategorySchema.safeParse(query.get("category") ?? "ALL");
  const page = z.coerce.number().int().min(1).max(10000).safeParse(query.get("page") ?? 1);
  const search = z.string().trim().max(120).regex(/^[^\p{Cc}\p{Cf}]*$/u).safeParse(query.get("search") ?? "");
  if (!category.success || !page.success || !search.success || Array.from(query.keys()).some((key) => !["category", "page", "search"].includes(key) || query.getAll(key).length > 1)) {
    return integrationResponse({ message: "Confira os filtros e a página selecionada." }, 400);
  }
  return forwardIntegrationRequest(request, {
    path: "/admin/pending", output: adminPendingSchema, unavailable: adminPendingUnavailable,
    searchParams: new URLSearchParams({ category: category.data, page: String(page.data), search: search.data }),
  });
}
