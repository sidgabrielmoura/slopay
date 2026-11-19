import type { NextRequest } from "next/server";
import { adminPendingUnavailable, pendingDetailSchema, pendingKeySchema } from "@/features/admin/admin-pending";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const key = pendingKeySchema.safeParse(query.get("key"));
  if (!key.success || query.size !== 1) return integrationResponse({ message: "Selecione uma pendência válida." }, 400);
  return forwardIntegrationRequest(request, {
    path: "/admin/pending/item", output: pendingDetailSchema, unavailable: adminPendingUnavailable,
    searchParams: new URLSearchParams({ key: key.data }),
  });
}
