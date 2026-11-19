import type { NextRequest } from "next/server";
import { adminChargeId, adminPixChargeQrSchema, adminQrUnavailable } from "@/features/admin/admin-pix-charges";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = adminChargeId.safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Cobrança Pix não encontrada." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-charges/${id.data}/qr-code`, output: adminPixChargeQrSchema, unavailable: adminQrUnavailable,
    timeoutMs: 26_000,
  });
}
