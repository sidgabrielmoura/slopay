import type { NextRequest } from "next/server";
import { z } from "zod";
import { maxOpeningDocumentBytes } from "@/features/account-validation/opening-documents";
import { requestBackend } from "@/lib/server/auth-backend";
import { integrationResponse } from "@/lib/server/integration-request";
import { accessCookie } from "@/lib/server/session";

const unavailable = "Não foi possível carregar o documento.";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success || request.nextUrl.search) {
    return integrationResponse({ message: "Documento não encontrado." }, 404);
  }
  const site = request.headers.get("sec-fetch-site");
  if (request.method !== "GET" || (site && site !== "same-origin")) return integrationResponse({ message: unavailable }, 403);
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return integrationResponse({ message: "Sua sessão expirou. Entre novamente." }, 401);
  try {
    const response = await requestBackend(`/admin/account-openings/${id}/documents/${documentId}`, {
      method: "GET", accessToken, signal: request.signal, timeoutMs: 15_000,
    });
    const length = Number(response.headers.get("content-length"));
    if (response.ok && response.body && response.headers.get("content-type") === "image/jpeg" &&
        Number.isSafeInteger(length) && length > 0 && length <= maxOpeningDocumentBytes) {
      return new Response(response.body, { headers: {
        "Content-Type": "image/jpeg", "Content-Length": String(length), "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; sandbox",
      } });
    }
    await response.body?.cancel();
    if ([401, 403, 404, 409, 429].includes(response.status)) return integrationResponse({ message: unavailable }, response.status);
  } catch {
    return integrationResponse({ message: unavailable }, 503);
  }
  return integrationResponse({ message: unavailable }, 503);
}
