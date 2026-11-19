import { authEntry } from "@/lib/auth-navigation";
import { authApiService } from "@/services/auth-api.service";
import { browserHasPasskeyHint, hasPlatformPasskeySupport } from "./passkey-device";

export async function finishSignIn(userId: string, destination: string) {
  const enrolling = destination.split("?")[0] === "/ativar-biometria";
  if (!enrolling && !browserHasPasskeyHint(userId) && await hasPlatformPasskeySupport()) {
    const session = await authApiService.sessionStatus().catch(() => null);
    if (session?.passkeysEnabled && !session.hasPasskey) {
      window.location.replace(authEntry("/ativar-biometria", destination));
      return;
    }
  }

  window.location.replace(destination);
}
