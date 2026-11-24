import type { NextRequest } from "next/server";
import { z } from "zod";
import { documentUpdatedSchema, replacementDocumentSchema } from "@/features/account-validation/opening-documents";
import { forwardIntegrationRequest, integrationResponse } from "@/lib/server/integration-request";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success || request.nextUrl.search) {
    return integrationResponse({ message: "Documento não encontrado." }, 404);
  }
  return forwardIntegrationRequest(request, {
    path: `/admin/account-openings/${id}/documents/${documentId}/replacement`,
    input: replacementDocumentSchema, output: documentUpdatedSchema,
    unavailable: "Não foi possível solicitar o reenvio.",
  });
}
