import type { NextRequest } from "next/server";
import { pixTransactionDetail, pixTransactionIdentifier, pixTransactionUnavailable } from "@/features/admin/admin-pix-transactions";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const reference = pixTransactionIdentifier.safeParse(await params);
  if (!reference.success) return integrationResponse({ message: "Transação Pix não encontrada." }, 404);
  const { kind, id } = reference.data;
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-transactions/${kind}/${id}`, output: pixTransactionDetail, unavailable: pixTransactionUnavailable,
  });
}
