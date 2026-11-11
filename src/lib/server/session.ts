import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { authEntry } from "@/lib/auth-navigation";
import { requestAuthBackend, sessionUserSchema, type AuthTokens } from "./auth-backend";

const secure = process.env.NODE_ENV === "production";
const prefix = secure ? "__Host-" : "";

export const accessCookie = prefix + "slopay_access";
export const refreshCookie = prefix + "slopay_refresh";
export const challengeCookie = prefix + "slopay_challenge";

export function setAuthCookie(response: NextResponse, name: string, value: string, maxAge: number) {
  response.cookies.set(name, value, {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge,
  });
}

export function saveSession(response: NextResponse, tokens: AuthTokens) {
  setAuthCookie(response, accessCookie, tokens.accessToken, tokens.expiresIn);
  setAuthCookie(response, refreshCookie, tokens.refreshToken, 7 * 24 * 60 * 60);
  setAuthCookie(response, challengeCookie, "", 0);
}

export function clearSession(response: NextResponse) {
  setAuthCookie(response, accessCookie, "", 0);
  setAuthCookie(response, refreshCookie, "", 0);
  setAuthCookie(response, challengeCookie, "", 0);
}

const loadSession = cache(async () => {
  const jar = await cookies();
  const accessToken = jar.get(accessCookie)?.value;
  const canRefresh = Boolean(jar.get(refreshCookie)?.value);

  if (!accessToken) return { state: canRefresh ? "expired" : "absent" } as const;
  try {
    const response = await requestAuthBackend("me", { method: "GET", accessToken });
    if (response.status === 401) {
      const error = await response.json().catch(() => null);
      const canRenewAccess = error?.code === "TOKEN_EXPIRED" || error?.code === "INVALID_SESSION";
      return { state: canRefresh && canRenewAccess ? "expired" : "absent" } as const;
    }
    if (response.status === 403) return { state: "absent" } as const;
    if (!response.ok) return { state: "unavailable" } as const;

    const profile = sessionUserSchema.safeParse((await response.json()).user);
    return profile.success
      ? { state: "ready", user: profile.data } as const
      : { state: "unavailable" } as const;
  } catch {
    return { state: "unavailable" } as const;
  }
});

export async function requireSession(
  returnTo: string,
  { operations = false, admin = false } = {},
) {
  const result = await loadSession();
  if (result.state === "expired") redirect(authEntry("/renovar", returnTo));
  if (result.state === "absent") redirect(authEntry("/entrar", returnTo));
  if (result.state !== "ready") redirect("/servico-indisponivel");

  const user = result.user;
  if (admin && user.role !== "ADMIN") notFound();

  if (operations || admin) {
    if (user.status !== "ACTIVE" || !user.isEmailVerified) redirect("/conta-em-validacao");
    if (!user.isTwoFactorEnabled) redirect("/conta/seguranca");
    if (!user.mfaVerified) redirect(authEntry("/entrar", returnTo));
  }

  return user;
}
