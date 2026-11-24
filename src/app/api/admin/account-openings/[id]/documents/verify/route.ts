import type { NextRequest } from "next/server";
import { z } from "zod";
import { documentUpdatedSchema, verifiedDocumentSchema } from "@/features/account-validation/opening-documents";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || request.nextUrl.search) {
    return integrationResponse({ message: "Cadastro não encontrado." }, 404);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/account-openings/${id}/documents/verify`,
    input: verifiedDocumentSchema, output: documentUpdatedSchema,
    unavailable: "Não foi possível registrar a conferência.",
  });
}
