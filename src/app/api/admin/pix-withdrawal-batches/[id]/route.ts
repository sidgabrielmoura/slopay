import type { NextRequest } from "next/server";
import { adminBatchDetailQuery, adminBatchDetailSchema, adminBatchId, adminBatchUnavailable } from "@/features/admin/admin-withdrawal-batches";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = adminBatchId.safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Lote de saída não encontrado." }, 404);
  const search = request.nextUrl.searchParams;
  const query = adminBatchDetailQuery.safeParse(Object.fromEntries(search));
  if (!query.success || search.getAll("page").length > 1) return integrationResponse({ message: "Confira a página solicitada." }, 400);
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-withdrawal-batches/${id.data}`, output: adminBatchDetailSchema, unavailable: adminBatchUnavailable,
    searchParams: new URLSearchParams({ page: String(query.data.page) }),
  });
}
