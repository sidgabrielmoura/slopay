import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LiveMfa } from "@/features/auth/components/live-mfa";
import { authEntry } from "@/lib/auth-navigation";
import { requireSession } from "@/lib/server/session";

export default async function SecurityPage() {
  const returnTo = "/conta/seguranca";
  const user = await requireSession(returnTo);
  if (user.status !== "ACTIVE" || !user.isEmailVerified) redirect("/conta-em-validacao");
  if (user.isTwoFactorEnabled && !user.mfaVerified) redirect(authEntry("/entrar", returnTo));

  return <AuthShell><LiveMfa enabled={Boolean(user.isTwoFactorEnabled)} /></AuthShell>;
}
