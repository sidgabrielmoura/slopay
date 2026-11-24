import "server-only";

import { captureException, flush } from "@sentry/nextjs";
import { isIP } from "node:net";
import { headers as requestHeaders } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { sentryDsn } from "@/config/sentry";
import { backendFailureMessage } from "@/lib/sentry-options";

const requestTimeoutMs = 8_000;
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function reportBackendFailure(path: string, status?: number) {
  if (!sentryDsn) return;
  captureException(new Error(backendFailureMessage), {
    tags: { "backend.area": path.startsWith("/auth/") ? "auth" : "api", "backend.status": status },
  });
  after(async () => { await flush(2000); });
}

const validOrigin = (value: string): URL => {
  const url = new URL(value);
  const allowHttp = process.env.NODE_ENV !== "production" && url.protocol === "http:";
  if ((url.protocol !== "https:" && !allowHttp) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("A origem precisa ser uma URL HTTPS sem caminho.");
  }
  return url;
};

export function appOrigin(requestUrl: string, requestHost?: string | null): string {
  const origin = process.env.SLOPAY_APP_ORIGIN;
  if (origin) return validOrigin(origin).origin;
  if (process.env.NODE_ENV !== "production") {
    const internal = new URL(requestUrl);
    if (requestHost) {
      const incoming = validOrigin(internal.protocol + "//" + requestHost);
      // Next dev may normalize request.url to localhost when the browser uses a loopback IP.
      if (loopbackHosts.has(internal.hostname) && loopbackHosts.has(incoming.hostname) &&
          incoming.port === internal.port) return incoming.origin;
    }
    return internal.origin;
  }
  throw new Error("SLOPAY_APP_ORIGIN ausente.");
}

export const sessionUserSchema = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  email: z.string(),
  role: z.enum(["ADMIN", "MERCHANT", "OPERATOR", "AUDITOR"]),
  status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "LOCKED"]),
  isEmailVerified: z.boolean(),
  onboardingRequired: z.boolean().optional(),
  isTwoFactorEnabled: z.boolean(),
  mfaVerified: z.boolean(),
  merchantId: z.string().nullish(),
});

export const authTokensSchema = z.object({
  accessToken: z.string().min(1).max(3000),
  refreshToken: z.string().min(1).max(3000),
  expiresIn: z.number().int().positive().max(86400),
  absoluteExpiresAt: z.iso.datetime().optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;

type BackendRequest = {
  method: "GET" | "POST" | "PATCH";
  body?: unknown;
  rawBody?: Uint8Array<ArrayBuffer>;
  accessToken?: string;
  idempotencyKey?: string;
  searchParams?: URLSearchParams;
  signal?: AbortSignal;
  stream?: boolean;
  timeoutMs?: number;
};

export async function requestBackend(path: `/${string}`, options: BackendRequest) {
  const configured = process.env.SLOPAY_BACKEND_URL ||
    (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3333" : "");
  const url = validOrigin(configured);
  url.pathname = path;
  if (options.searchParams) url.search = options.searchParams.toString();
  const headers = new Headers({
    Accept: options.stream ? "text/event-stream" : "application/json",
    "X-Correlation-ID": crypto.randomUUID(),
  });

  const trustedClientIpHeader = process.env.SLOPAY_TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (trustedClientIpHeader) {
    if (!/^[a-z0-9-]{1,64}$/.test(trustedClientIpHeader)) {
      throw new Error("SLOPAY_TRUSTED_CLIENT_IP_HEADER inválido.");
    }
    const clientIp = (await requestHeaders()).get(trustedClientIpHeader)?.trim();
    if (clientIp && isIP(clientIp)) headers.set("X-Forwarded-For", clientIp);
  }

  if (options.rawBody) headers.set("Content-Type", "application/octet-stream");
  else if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  const timeout = AbortSignal.timeout(options.timeoutMs ?? (options.stream ? 65_000 : requestTimeoutMs));
  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    cache: "no-store",
    redirect: "error",
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  }).catch((error: unknown) => {
    if (!options.signal?.aborted) reportBackendFailure(path);
    throw error;
  });
  if (response.status >= 500) reportBackendFailure(path, response.status);
  return response;
}

export function requestAuthBackend(path: string, options: BackendRequest) {
  return requestBackend(`/auth/${path}`, options);
}
