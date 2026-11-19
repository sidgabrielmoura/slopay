import type { SessionUser } from "@/lib/server/auth-backend";

const privateSegments = new Set([
  "inicio", "admin", "pix", "movimentacoes", "aprovacoes",
  "integracoes", "conta", "conta-em-validacao", "indicadores", "ativar-biometria",
  "preferencias", "mais", "ajuda", "controle-financeiro", "comprovantes", "abertura-da-conta", "verify-email",
]);

export const accountOpeningPath = "/abertura-da-conta";
export const emailVerificationPath = "/verify-email";

export function needsAccountOpening(user: Pick<SessionUser, "role" | "onboardingRequired">) {
  return user.role === "MERCHANT" && user.onboardingRequired === true;
}

export function onboardingDestination(
  user: Pick<SessionUser, "status" | "isEmailVerified" | "isTwoFactorEnabled">,
) {
  if (!user.isTwoFactorEnabled) return "/conta/seguranca";
  if (!user.isEmailVerified) return emailVerificationPath;
  if (user.status !== "ACTIVE") return "/conta-em-validacao";
  return null;
}

export function registrationCompletePath(user: Pick<SessionUser, "role" | "onboardingRequired">) {
  if (needsAccountOpening(user)) return accountOpeningPath;
  return user.role === "ADMIN" ? "/admin" : "/inicio";
}

export function safeReturnTo(raw: string | null | undefined, fallback = "/inicio"): string {
  if (!raw || raw.length > 2048 || !raw.startsWith("/") || raw.startsWith("//") ||
      /[\\\u0000-\u0020\u007f]/.test(raw)) {
    return fallback;
  }

  const base = "https://slopay.invalid";
  const destination = new URL(raw, base);
  const section = destination.pathname.split("/")[1];
  if (destination.origin !== base || !privateSegments.has(section)) {
    return fallback;
  }

  return destination.pathname + destination.search;
}

export function authEntry(path: "/entrar" | "/renovar" | "/ativar-biometria", returnTo: string): string {
  const params = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  return `${path}?${params}`;
}
