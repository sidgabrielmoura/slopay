import type { NextRequest } from "next/server";
import { requestBackend } from "@/lib/server/auth-backend";
import { integrationResponse } from "@/lib/server/integration-request";
import { accessCookie } from "@/lib/server/session";

export const runtime = "nodejs";
export const maxDuration = 65;

export async function GET(request: NextRequest) {
  if (request.nextUrl.search) return integrationResponse({ message: "Solicitação inválida." }, 400);
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return integrationResponse({ message: "Origem inválida." }, 403);
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!accessToken) return integrationResponse({ message: "Sua sessão expirou." }, 401);
  try {
    const response = await requestBackend("/admin/live", { method: "GET", accessToken, stream: true, signal: request.signal });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/event-stream")) {
      await response.body?.cancel();
      return integrationResponse({ message: "O canal de notificações está indisponível." }, [401, 403, 429].includes(response.status) ? response.status : 503);
    }
    return new Response(response.body, { headers: {
      "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "private, no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return integrationResponse({ message: "O canal de notificações está indisponível." }, 503);
  }
}
