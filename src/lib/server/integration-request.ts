import "server-only";

import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { appOrigin, requestBackend } from "./auth-backend";
import { readJson, RequestBodyError } from "./request-json";
import { accessCookie } from "./session";

export function integrationResponse(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function forwardIntegrationRequest(request: NextRequest, operation: {
  path: `/${string}`;
  output: ZodType<object>;
  input?: ZodType<object>;
  searchParams?: URLSearchParams;
  timeoutMs?: number;
  unavailable: string;
}) {
  if (operation.input) {
    try {
      const fetchSite = request.headers.get("sec-fetch-site");
      if ((fetchSite && fetchSite !== "same-origin") ||
          request.headers.get("origin") !== appOrigin(request.url, request.headers.get("host"))) {
        return integrationResponse({ message: "Origem da solicitação inválida." }, 403);
      }
    } catch {
      return integrationResponse({ message: operation.unavailable }, 503);
    }
  }

  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return integrationResponse({ message: "Sua sessão expirou. Entre novamente." }, 401);

  let input: object | undefined;
  if (operation.input) {
    try {
      const result = operation.input.safeParse(await readJson(request, 20_480));
      if (!result.success) return integrationResponse({ message: "Confira os dados informados." }, 400);
      input = result.data;
    } catch (error) {
      return error instanceof RequestBodyError
        ? integrationResponse({ message: error.message }, error.status)
        : integrationResponse({ message: "Os dados enviados são inválidos." }, 400);
    }
  }

  try {
    const response = await requestBackend(operation.path, {
      method: operation.input ? "POST" : "GET", body: input, accessToken, searchParams: operation.searchParams,
      timeoutMs: operation.timeoutMs, signal: request.signal,
    });
    if (response.status >= 500) {
      await response.body?.cancel();
      return integrationResponse({ message: operation.unavailable }, 503);
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const details = body && typeof body === "object" ? body : {};
      const code = "code" in details && typeof details.code === "string" ? details.code : undefined;
      const message = "message" in details && typeof details.message === "string" ? details.message : null;
      return integrationResponse({
        code,
        message: response.status === 429 ? "Aguarde um instante antes de tentar novamente."
          : response.status === 401 ? "Sua sessão expirou. Entre novamente."
          : message?.slice(0, 240) || "A operação foi recusada.",
      }, response.status);
    }
    const result = operation.output.safeParse(body);
    if (result.success) return integrationResponse(result.data, response.status);
  } catch {
    return integrationResponse({ message: operation.unavailable }, 503);
  }
  return integrationResponse({ message: operation.unavailable }, 503);
}

