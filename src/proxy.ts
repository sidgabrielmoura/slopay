import { NextResponse, type NextRequest } from "next/server";
import { developmentFeaturesEnabled } from "@/config/development";
import { isDevelopmentRoute } from "@/config/development-routes";
import { sentryIngestOrigin } from "@/config/sentry";
import { supportApiRequestHeader } from "@/lib/support-scope";

const legacyCookies = ["slopay_access_token", "slopay_refresh_token", "slopay_user"];

export function proxy(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  if (!developmentFeaturesEnabled() && isDevelopmentRoute(pathname, request.method)) {
    const headers = { "cache-control": "no-store", "x-correlation-id": correlationId };
    return NextResponse.json({ message: "Recurso não encontrado." }, { status: 404, headers });
  }
  const headers = new Headers(request.headers);
  headers.set("x-correlation-id", correlationId);
  if (pathname.startsWith("/api/")) headers.set(supportApiRequestHeader, "1");
  else headers.delete(supportApiRequestHeader);

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    ...(pathname === "/capturar-documentos" ? ["media-src 'self' blob:"] : []),
    "font-src 'self'",
    ["connect-src 'self'", sentryIngestOrigin].filter(Boolean).join(" "),
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");

  const applyCsp = process.env.NODE_ENV === "production";
  if (applyCsp) headers.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-correlation-id", correlationId);
  if (applyCsp) response.headers.set("content-security-policy", policy);
  for (const name of legacyCookies) {
    if (request.cookies.has(name)) response.cookies.delete(name);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
