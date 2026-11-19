import type { NextRequest } from "next/server";
import { adminApprovalDetailSchema, adminApprovalId, adminApprovalUnavailable } from "@/features/admin/admin-withdrawal-approvals";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = adminApprovalId.safeParse((await params).id);
  if (!id.success) return integrationResponse({ message: "Solicitação de aprovação não encontrada." }, 404);
  return forwardIntegrationRequest(request, {
    path: `/admin/withdrawal-approvals/${id.data}`, output: adminApprovalDetailSchema, unavailable: adminApprovalUnavailable,
  });
}
