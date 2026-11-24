import { startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { ApiError } from "@/lib/api-client";

export type PasskeyMethod = "device" | "phone";

export function canUseWebAuthn() {
  return window.isSecureContext && Boolean(window.PublicKeyCredential) && typeof navigator.credentials?.get === "function";
}

export async function hasPlatformPasskeySupport() {
  const key = window.PublicKeyCredential;
  if (!window.isSecureContext || typeof key?.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
    return false;
  }
  return key.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
}

export async function authenticateWithPasskey(options: PublicKeyCredentialRequestOptionsJSON, method: PasskeyMethod) {
  const credential = await startAuthentication({ optionsJSON: {
    ...options,
    hints: [method === "device" ? "client-device" : "hybrid"],
    allowCredentials: options.allowCredentials?.map((item) => ({
      ...item, transports: [method === "device" ? "internal" : "hybrid"],
    })),
  } });
  if (method === "device" && credential.authenticatorAttachment === "cross-platform") {
    throw new ApiError("Selecione a chave salva neste aparelho ou escolha Usar celular para continuar com o QR Code.", 400);
  }
  return credential;
}

export function passkeyFailureMessage(failure: unknown, method: PasskeyMethod) {
  if (failure instanceof ApiError && failure.code !== "INVALID_PASSKEY") return failure.message;
  const cause = failure instanceof Error && failure.cause instanceof Error ? failure.cause : failure;
  if (cause instanceof Error && cause.name === "SecurityError") {
    return "Confira se você abriu o mesmo endereço do Slopay onde cadastrou a chave de acesso.";
  }
  return method === "phone"
    ? "A chave do celular não foi confirmada. Use o celular onde ela foi salva ou continue com o autenticador."
    : "A chave não foi confirmada neste aparelho. Tente novamente ou continue com o autenticador.";
}

export function isIphoneOrIpad() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function passkeyHintKey(userId: string) {
  return "slopay:passkey:" + userId;
}

export function browserHasPasskeyHint(userId: string) {
  try {
    return localStorage.getItem(passkeyHintKey(userId)) === "enabled";
  } catch {
    return false;
  }
}

export function rememberBrowserPasskey(userId: string) {
  try {
    localStorage.setItem(passkeyHintKey(userId), "enabled");
  } catch {
    // Enrollment stays valid when browser storage is unavailable.
  }
}
