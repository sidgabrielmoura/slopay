import { ApiError } from "@/lib/api-client";
import { supportRequestHeaders } from "@/lib/support-scope";
import type { PasskeyList, PasskeyOptions, PasskeyPair } from "@/features/auth/passkey-contract";
import type { PasswordChangeChallenge, PasswordChangeGrant } from "@/features/auth/password-change-contract";
import type { RegistrationEmailChallenge } from "@/features/auth/registration-email-contract";
import type { SessionUser } from "@/lib/server/auth-backend";
import type {
  AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

type LoginUser = Pick<SessionUser, "id" | "role" | "status" | "onboardingRequired" | "isEmailVerified" | "isTwoFactorEnabled">;
type LoginResult = { requires2FA: true } | { user: LoginUser };
type Success = { success: true; message?: string };
const authRequestTimeoutMs = process.env.NODE_ENV === "development" ? 60_000 : 12_000;
type SessionTimes = { idleExpiresAt: string; absoluteExpiresAt: string };
export type SessionStatus = SessionTimes & {
  state: "active" | "locked";
  requiresMfa: boolean;
  passkeysEnabled: boolean;
  hasPasskey: boolean;
  accessExpiresAt: number | null;
};

async function post<T>(path: string, body?: unknown): Promise<T> {
  const url = `/api/auth/${path}`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: supportRequestHeaders(url, body === undefined ? undefined : { "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(authRequestTimeoutMs),
  }).catch(() => {
    throw new ApiError("Serviço de autenticação indisponível. Tente novamente.", 503);
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const code = result?.code;
    if (response.status === 401 && !["session/status", "refresh"].includes(path) &&
        ["SESSION_EXPIRED", "SESSION_REVOKED", "TOKEN_EXPIRED", "INVALID_SESSION", "SESSION_IDLE"].includes(code)) {
      window.dispatchEvent(new Event("slopay:session-check"));
    }
    throw new ApiError(result?.message || "Não foi possível concluir a solicitação.", response.status, code);
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
  passkeyLoginOptions() {
    return post<PasskeyOptions>("passkeys/login/options");
  },
  completeLoginWithPasskey(credential: AuthenticationResponseJSON) {
    return post<{ user: LoginUser }>("passkeys/login", { credential });
  },
  register(body: { fullName: string; email: string; cpf: string; phone: string; password: string; invitation?: string }) {
    return post<Success>("register", body);
  },
  forgotPassword(email: string) {
    return post<Success>("forgot-password", { email: email.trim().toLowerCase() });
  },
  resetPassword(token: string, newPassword: string) {
    return post<Success>("reset-password", { token, newPassword });
  },
  requestPasswordChange(expectedUserId: string, confirmedEmail: string, resend: boolean) {
    return post<PasswordChangeChallenge>("password-change/request", { expectedUserId, confirmedEmail, resend });
  },
  verifyPasswordChange(challengeId: string, code: string) {
    return post<PasswordChangeGrant>("password-change/verify", { challengeId, code });
  },
  completePasswordChange(challengeId: string, grant: string, newPassword: string) {
    return post<Success>("password-change/complete", { challengeId, grant, newPassword });
  },
  verifyEmail(token: string) {
    return post<Success>("verify-email", { token });
  },
  requestRegistrationEmailCode(confirmedEmail: string, resend = false) {
    return post<RegistrationEmailChallenge>("email-verification/request", { confirmedEmail, resend });
  },
  verifyRegistrationEmailCode(challengeId: string, code: string) {
    return post<Success>("email-verification/verify", { challengeId, code });
  },
  correctRegistrationEmail(confirmedEmail: string, newEmail: string) {
    return post<Success>("email-verification/correct", { confirmedEmail, newEmail });
  },
  refresh() {
    return post<Success>("refresh");
  },
  sessionStatus() {
    return post<SessionStatus>("session/status");
  },
  recordActivity() {
    return post<SessionTimes>("session/activity");
  },
  updateProfilePhone(expectedUserId: string, phone: string) {
    return post<{ phone: string }>("profile/phone", { expectedUserId, phone });
  },
  passkeyCredentials() {
    return post<PasskeyList>("passkeys/credentials");
  },
  passkeyTestOptions() {
    return post<PasskeyOptions>("passkeys/security/options", { action: "test-passkey" });
  },
  reauthenticate(password: string, twoFactorCode: string) {
    return post<Success>("reauth", { password, twoFactorCode });
  },
  testPasskey(credential: AuthenticationResponseJSON) {
    return post<Success>("passkeys/test", { credential });
  },
  passkeyRegistrationOptions(replaceId?: string) {
    return post<PublicKeyCredentialCreationOptionsJSON>("passkeys/register/options", { replaceId });
  },
  registerPasskey(credential: RegistrationResponseJSON, replaceId?: string) {
    return post<Success & { credentialId: string }>("passkeys/register", { credential, replaceId });
  },
  passkeyRotateOptions(pair: PasskeyPair) {
    return post<PublicKeyCredentialRequestOptionsJSON>("passkeys/replace/options", pair);
  },
  rotatePasskey(pair: PasskeyPair, credential: AuthenticationResponseJSON) {
    return post<Success>("passkeys/replace", { ...pair, credential });
  },
  passkeyUnlockOptions() {
    return post<PublicKeyCredentialRequestOptionsJSON>("passkeys/unlock/options");
  },
  unlockWithPasskey(credential: AuthenticationResponseJSON) {
    return post<Success>("passkeys/unlock", { credential });
  },
  unlockWithPassword(password: string, code?: string) {
    return post<Success>("session/unlock", { password, code });
  },
  logout() {
    return post<Success>("logout");
  },
  passkeyReplacementOptions() {
    return post<PasskeyOptions>("passkeys/security/options", { action: "replace-authenticator" });
  },
  setup2FA(password: string, factor?: { currentCode: string } | { credential: AuthenticationResponseJSON }) {
    return post<{ secret: string; qrCodeUri: string }>("2fa/setup", {
      password,
      ...factor,
    });
  },
  verify2FA(code: string) {
    return post<{ backupCodes: string[] }>("2fa/verify", { code: code.trim() });
  },
};
