import { NextResponse, type NextRequest } from "next/server";
import {
  captureProgressSchema, claimCaptureSchema, claimedCaptureSchema,
} from "@/features/account-validation/opening-documents";
import { requestBackend } from "@/lib/server/auth-backend";
import { integrationResponse } from "@/lib/server/integration-request";
import { documentCaptureCookie, isOpeningDocumentOrigin, openingDocumentCaptureId, readOpeningDocumentCapture } from "@/lib/server/opening-document-upload";
import { readJson, RequestBodyError } from "@/lib/server/request-json";

const unavailable = "O envio pelo celular está temporariamente indisponível.";
const inactive = "Este QR Code expirou ou já foi utilizado. Gere um novo no computador.";

function captureProblem(status: number) {
  if (status === 429) return integrationResponse({ message: "Aguarde um instante e tente novamente." }, 429);
  if (status === 401 || status === 409) {
    return integrationResponse({ code: "OPENING_CAPTURE_INACTIVE", message: inactive }, 401);
  }
  return integrationResponse({ message: unavailable }, 503);
}

export async function POST(request: NextRequest) {
  try {
    if (!isOpeningDocumentOrigin(request)) return integrationResponse({ message: "Origem da solicitação inválida." }, 403);
    const input = claimCaptureSchema.safeParse(await readJson(request, 512));
    if (!input.success) return integrationResponse({ message: "QR Code inválido." }, 400);
    const response = await requestBackend("/account-opening/documents/capture/claim", {
      method: "POST", body: input.data, signal: request.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return captureProblem(response.status);
    }
    const result = claimedCaptureSchema.safeParse(await response.json());
    if (!result.success) return captureProblem(503);
    const { device, progress } = result.data;
    const maxAge = Math.floor((Date.parse(progress.expiresAt) - Date.now()) / 1000);
    if (maxAge <= 0) return captureProblem(401);
    const reply = NextResponse.json({ ...progress, id: openingDocumentCaptureId(device) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
    reply.cookies.set(documentCaptureCookie, device, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge,
    });
    return reply;
  } catch (error) {
    if (error instanceof RequestBodyError) return integrationResponse({ message: error.message }, error.status);
    if (error instanceof SyntaxError) return integrationResponse({ message: "QR Code inválido." }, 400);
    return captureProblem(503);
  }
}

export async function GET(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return integrationResponse({ message: "Origem da solicitação inválida." }, 403);
  const capture = readOpeningDocumentCapture(request);
  if (!capture) return captureProblem(401);
  try {
    const response = await requestBackend("/account-opening/documents/capture/status", {
      method: "GET", accessToken: capture.token, signal: request.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return captureProblem(response.status);
    }
    const result = captureProgressSchema.safeParse(await response.json());
    if (result.success) return integrationResponse({ ...result.data, id: capture.id });
  } catch {
    return captureProblem(503);
  }
  return captureProblem(503);
}
