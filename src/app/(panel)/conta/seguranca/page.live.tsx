import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveSecurityScreen } from "@/features/account/components/live-security-screen";
import { AuthShell, accountSetupSteps } from "@/features/auth/components/auth-shell";
import { LiveMfa } from "@/features/auth/components/live-mfa";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { accountOpeningPath, needsAccountOpening, onboardingDestination } from "@/lib/auth-navigation";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Segurança" };

export default async function SecurityPage() {
  const user = await requireSession("/conta/seguranca");
  const destination = onboardingDestination(user);
  if (destination && destination !== "/conta/seguranca") redirect(destination);
  if (!destination && needsAccountOpening(user)) redirect(accountOpeningPath);

  if (!user.isTwoFactorEnabled || user.role === "ADMIN") {
    return (
      <AuthShell progress={user.isTwoFactorEnabled ? undefined : { steps: accountSetupSteps, current: 1 }}>
        {user.isTwoFactorEnabled && <SessionMonitor />}
        <LiveMfa userId={user.id} enabled={user.isTwoFactorEnabled} needsEmailConfirmation={!user.isEmailVerified}
          panelPath={user.role === "ADMIN" ? "/admin" : "/inicio"} animateSteps />
      </AuthShell>
    );
  }

  return (
    <MerchantPanel user={user}>
      <LiveSecurityScreen key={user.id} userId={user.id} email={user.email} />
    </MerchantPanel>
  );
}
