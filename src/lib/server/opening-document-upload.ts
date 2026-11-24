import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { captureIdHeader, captureTokenSchema, maxOpeningDocumentBytes, openingDocumentSchema } from "@/features/account-validation/opening-documents";
import { appOrigin, requestBackend } from "./auth-backend";
import { integrationResponse } from "./integration-request";
import { readBoundedBody, RequestBodyError } from "./request-json";

export const documentUploadUnavailable = "O envio de documentos está temporariamente indisponível.";
export const documentCaptureCookie = (process.env.NODE_ENV === "production" ? "__Host-" : "") + "slopay_document_capture";

export function openingDocumentCaptureId(device: string) {
  return createHash("sha256").update(device).digest("hex").slice(0, 32);
}

export function readOpeningDocumentCapture(request: NextRequest) {
  const cookie = captureTokenSchema.safeParse(request.cookies.get(documentCaptureCookie)?.value);
  if (!cookie.success) return;
  // A newer QR Code in another tab can overwrite the cookie for this browser.
  const id = openingDocumentCaptureId(cookie.data);
  if (request.headers.get(captureIdHeader) === id) return { token: cookie.data, id };
}

export function isOpeningDocumentOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  return (!site || site === "same-origin") &&
    request.headers.get("origin") === appOrigin(request.url, request.headers.get("host"));
}

export async function forwardOpeningDocumentUpload(
  request: NextRequest, path: `/${string}`, token?: string, searchParams?: URLSearchParams,
) {
  try {
    if (!isOpeningDocumentOrigin(request)) {
      return integrationResponse({ message: "Origem da solicitação inválida." }, 403);
    }
    if (!token) return integrationResponse({ message: "Sua sessão de envio expirou." }, 401);
    if (request.headers.get("content-type") !== "application/octet-stream" ||
        ![null, "identity"].includes(request.headers.get("content-encoding"))) {
      return integrationResponse({ message: "Envie uma imagem JPG ou PNG." }, 415);
    }

    const rawBody = await readBoundedBody(request, maxOpeningDocumentBytes);
    if (!rawBody.length) return integrationResponse({ message: "Escolha a imagem para enviar." }, 400);
    const response = await requestBackend(path, {
      method: "POST", rawBody, accessToken: token, searchParams, timeoutMs: 20_000, signal: request.signal,
    });
    if (response.status >= 500) {
      await response.body?.cancel();
      return integrationResponse({ message: documentUploadUnavailable }, 503);
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) return integrationResponse({
      ...(body?.code === "OPENING_CAPTURE_INACTIVE" ? { code: body.code } : {}),
      message: typeof body?.message === "string" ? body.message.slice(0, 240) : "Não foi possível enviar a imagem.",
    }, response.status);
    const document = openingDocumentSchema.safeParse(body);
    if (document.success) return integrationResponse(document.data, response.status);
  } catch (error) {
    if (error instanceof RequestBodyError) return integrationResponse({ message: error.message }, error.status);
  }
  return integrationResponse({ message: documentUploadUnavailable }, 503);
}
