import { NextResponse, type NextRequest } from "next/server";

const legacyCookies = ["slopay_access_token", "slopay_refresh_token", "slopay_user"];

export function proxy(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-correlation-id", correlationId);

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
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
