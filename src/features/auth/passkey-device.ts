export async function hasPlatformPasskeySupport() {
  const key = window.PublicKeyCredential;
  if (!window.isSecureContext || typeof key?.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
    return false;
  }
  return key.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
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
