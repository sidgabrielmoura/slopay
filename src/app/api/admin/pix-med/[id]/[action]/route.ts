import type { NextRequest } from "next/server";
import { medId, medMutation, medReview, medSync } from "@/features/admin/admin-pix-med";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; action: string }> }) {
  const { id: candidate, action } = await context.params;
  const id = medId.safeParse(candidate);
  if (!id.success || (action !== "review" && action !== "sync")) {
    return integrationResponse({ message: "Operação indisponível para esta contestação." }, 404);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/pix-med/${id.data}/${action}`,
    input: action === "review" ? medReview : medSync,
    output: medMutation,
    unavailable: action === "review" ? "Não foi possível salvar a revisão." : "Não foi possível conferir os dados no provedor.",
    timeoutMs: 12_000,
  });
}
