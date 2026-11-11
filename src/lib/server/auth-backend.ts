import "server-only";

import { z } from "zod";

const requestTimeoutMs = 8_000;

const validOrigin = (value: string): URL => {
  const url = new URL(value);
  const allowHttp = process.env.NODE_ENV !== "production" && url.protocol === "http:";
  if ((url.protocol !== "https:" && !allowHttp) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("A origem precisa ser uma URL HTTPS sem caminho.");
  }
  return url;
};

export function appOrigin(requestUrl: string): string {
  const origin = process.env.SLOPAY_APP_ORIGIN;
  if (origin) return validOrigin(origin).origin;
  if (process.env.NODE_ENV !== "production") return new URL(requestUrl).origin;
  throw new Error("SLOPAY_APP_ORIGIN ausente.");
}

export const sessionUserSchema = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  email: z.string(),
  role: z.enum(["ADMIN", "MERCHANT", "OPERATOR", "AUDITOR"]),
  status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "LOCKED"]),
  isEmailVerified: z.boolean().optional(),
  isTwoFactorEnabled: z.boolean().optional(),
  mfaVerified: z.boolean().optional(),
});

export const authTokensSchema = z.object({
  accessToken: z.string().min(1).max(3000),
  refreshToken: z.string().min(1).max(3000),
  expiresIn: z.number().int().positive().max(86400),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;

export async function requestAuthBackend(
  path: string,
  options: { method: "GET" | "POST"; body?: unknown; accessToken?: string },
) {
  const configured = process.env.SLOPAY_BACKEND_URL ||
    (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3333" : "");
  const url = new URL(`/auth/${path}`, validOrigin(configured));
  const headers = new Headers({
    Accept: "application/json",
    "X-Correlation-ID": crypto.randomUUID(),
  });

  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  return fetch(url, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
}
