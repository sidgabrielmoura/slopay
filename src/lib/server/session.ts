import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { authEntry, onboardingDestination } from "@/lib/auth-navigation";
import { requestAuthBackend, sessionUserSchema, type AuthTokens } from "./auth-backend";

const secure = process.env.NODE_ENV === "production";
const prefix = secure ? "__Host-" : "";

export const accessCookie = prefix + "slopay_access";
export const refreshCookie = prefix + "slopay_refresh";
export const challengeCookie = prefix + "slopay_challenge";
export const sessionMarkerCookie = prefix + "slopay_session_seen";

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
  const remaining = tokens.absoluteExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(tokens.absoluteExpiresAt) - Date.now()) / 1000))
    : 8 * 60 * 60;
  setAuthCookie(response, refreshCookie, tokens.refreshToken, remaining);
  setAuthCookie(response, challengeCookie, "", 0);
  rememberSession(response, remaining);
}

export function rememberSession(response: NextResponse, remaining = 8 * 60 * 60) {
  setAuthCookie(response, sessionMarkerCookie, "1", remaining + 24 * 60 * 60);
}

export function clearSession(response: NextResponse, endedByUser = true) {
  setAuthCookie(response, accessCookie, "", 0);
  setAuthCookie(response, refreshCookie, "", 0);
  setAuthCookie(response, challengeCookie, "", 0);
  if (endedByUser) setAuthCookie(response, sessionMarkerCookie, "", 0);
}

const loadSession = cache(async () => {
  const jar = await cookies();
  const accessToken = jar.get(accessCookie)?.value;
  const canRefresh = Boolean(jar.get(refreshCookie)?.value);

  if (!accessToken) return { state: canRefresh ? "renew" : jar.has(sessionMarkerCookie) ? "expired" : "absent" } as const;
  try {
    const response = await requestAuthBackend("me", { method: "GET", accessToken });
    if (response.status === 401) {
      const error = await response.json().catch(() => null);
      const canRenewAccess = ["TOKEN_EXPIRED", "INVALID_SESSION", "SESSION_IDLE"].includes(error?.code);
      return { state: canRefresh && canRenewAccess ? "renew" : "expired" } as const;
    }
    if (response.status === 403) return { state: "expired" } as const;
    if (!response.ok) return { state: "unavailable" } as const;

    const profile = sessionUserSchema.safeParse((await response.json()).user);
    return profile.success
      ? { state: "ready", user: profile.data } as const
      : { state: "unavailable" } as const;
  } catch {
    return { state: "unavailable" } as const;
  }
});

export async function loadPanelUser() {
  const result = await loadSession();
  return result.state === "ready" && result.user.mfaVerified && !onboardingDestination(result.user)
    ? result.user
    : null;
}

export async function requireSession(
  returnTo: string,
  { operations = false, admin = false } = {},
) {
  const result = await loadSession();
  if (result.state === "renew") redirect(authEntry("/renovar", returnTo));
  if (result.state === "expired") redirect(authEntry("/renovar", returnTo) + "&estado=expirada");
  if (result.state === "absent") redirect(authEntry("/entrar", returnTo));
  if (result.state !== "ready") redirect("/servico-indisponivel");

  const user = result.user;
  if (admin && user.role !== "ADMIN") notFound();
  if (user.isTwoFactorEnabled && !user.mfaVerified) redirect(authEntry("/entrar", returnTo));

  if (operations || admin) {
    const destination = onboardingDestination(user);
    if (destination) redirect(destination);
  }

  return user;
}
