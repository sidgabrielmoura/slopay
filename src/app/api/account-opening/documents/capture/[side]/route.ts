import type { NextRequest } from "next/server";
import { openingDocumentSide } from "@/features/account-validation/opening-documents";
import { integrationResponse } from "@/lib/server/integration-request";
import { forwardOpeningDocumentUpload, readOpeningDocumentCapture } from "@/lib/server/opening-document-upload";

export async function POST(request: NextRequest, { params }: { params: Promise<{ side: string }> }) {
  const { side } = await params;
  const result = openingDocumentSide.safeParse(side);
  if (!result.success || request.nextUrl.search) return integrationResponse({ message: "Lado inválido." }, 400);
  return forwardOpeningDocumentUpload(request, `/account-opening/documents/capture/upload/${result.data}`,
    readOpeningDocumentCapture(request)?.token);
}
