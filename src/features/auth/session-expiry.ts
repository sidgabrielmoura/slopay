import { toast } from "sonner";
import { authEntry } from "@/lib/auth-navigation";

let redirecting = false;

export function redirectExpiredSession(returnTo: string) {
  if (redirecting) return;
  redirecting = true;
  toast.loading("Sessão expirada, aguarde...", {
    id: "session-expired",
    closeButton: false,
    dismissible: false,
  });
  window.setTimeout(() => window.location.replace(authEntry("/entrar", returnTo)), 900);
}
