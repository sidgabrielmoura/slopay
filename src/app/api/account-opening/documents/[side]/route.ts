import type { NextRequest } from "next/server";
import { openingDocumentKind, openingDocumentSide } from "@/features/account-validation/opening-documents";
import { integrationResponse } from "@/lib/server/integration-request";
import { forwardOpeningDocumentUpload } from "@/lib/server/opening-document-upload";
import { accessCookie } from "@/lib/server/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ side: string }> }) {
  const { side } = await params;
  const parsed = openingDocumentSide.safeParse(side);
  const kind = openingDocumentKind.safeParse(request.nextUrl.searchParams.get("kind"));
  if (!parsed.success || !kind.success || request.nextUrl.searchParams.size !== 1) {
    return integrationResponse({ message: "Selecione o tipo e o lado do documento." }, 400);
  }
  return forwardOpeningDocumentUpload(request, `/account-opening/documents/${parsed.data}`,
    request.cookies.get(accessCookie)?.value, new URLSearchParams({ kind: kind.data }));
}
