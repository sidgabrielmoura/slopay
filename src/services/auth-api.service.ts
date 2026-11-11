import { ApiError } from "@/lib/api-client";
import type { SessionUser } from "@/lib/server/auth-backend";

type LoginUser = Pick<SessionUser, "role">;
type LoginResult = { requires2FA: true } | { user: LoginUser };
type Success = { success: true; message?: string };

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }).catch(() => {
    throw new ApiError("Serviço de autenticação indisponível. Tente novamente.", 503);
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new ApiError(result?.message || "Não foi possível concluir a solicitação.", response.status, result?.code);
  }
  return result;
}

export const authApiService = {
  login(email: string, password: string) {
    return post<LoginResult>("login", { email: email.trim().toLowerCase(), password });
  },
  completeLogin(code: string) {
    return post<{ user: LoginUser }>("login/2fa", { code: code.trim() });
  },
  register(body: { fullName: string; email: string; cpf: string; phone: string; password: string }) {
    return post<Success>("register", body);
  },
  forgotPassword(email: string) {
    return post<Success>("forgot-password", { email: email.trim().toLowerCase() });
  },
  resetPassword(token: string, newPassword: string) {
    return post<Success>("reset-password", { token, newPassword });
  },
  verifyEmail(token: string) {
    return post<Success>("verify-email", { token });
  },
  resendVerification() {
    return post<Success>("resend-verification");
  },
  refresh() {
    return post<Success>("refresh");
  },
  logout() {
    return post<Success>("logout");
  },
  setup2FA(password: string, currentCode?: string) {
    return post<{ secret: string; qrCodeUri: string }>("2fa/setup", {
      password,
      currentCode: currentCode?.trim() || undefined,
    });
  },
  verify2FA(code: string) {
    return post<{ backupCodes: string[] }>("2fa/verify", { code: code.trim() });
  },
};
