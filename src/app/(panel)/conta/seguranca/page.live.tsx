import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveSecurityScreen } from "@/features/account/components/live-security-screen";
import { SecurityLayout } from "@/features/account/components/security-layout";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPanel } from "@/features/admin/components/layout/admin-panel";
import { AuthShell, securitySetupSteps } from "@/features/auth/components/auth-shell";
import { LiveMfa } from "@/features/auth/components/live-mfa";
import { PasskeySettings } from "@/features/auth/components/passkey-settings";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { onboardingDestination } from "@/lib/auth-navigation";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Segurança" };

export default async function SecurityPage() {
  const user = await requireSession("/conta/seguranca");
  const destination = onboardingDestination(user);
  if (destination && destination !== "/conta/seguranca") redirect(destination);

  if (!user.isTwoFactorEnabled) {
    return (
      <AuthShell progress={{ steps: securitySetupSteps, current: 0 }}>
        <SessionMonitor />
        <LiveMfa userId={user.id} enabled={false} needsEmailConfirmation={!user.isEmailVerified}
          panelPath={user.role === "ADMIN" ? "/admin" : "/inicio"} animateSteps />
      </AuthShell>
    );
  }

  if (user.role === "ADMIN") {
    return (
      <AdminActivityProvider accountId={user.id}>
        <AdminPanel user={{ id: user.id, fullName: user.fullName, email: user.email }}>
          <SecurityLayout title="Segurança da conta">
            <LiveMfa key={user.id} userId={user.id} enabled panelPath="/admin" showLogout={false}
              panel={{ biometrics: <PasskeySettings userId={user.id} returnTo="/conta/seguranca" /> }} />
          </SecurityLayout>
        </AdminPanel>
      </AdminActivityProvider>
    );
  }

  return (
    <MerchantPanel user={user}>
      <LiveSecurityScreen key={user.id} userId={user.id} email={user.email} />
    </MerchantPanel>
  );
}
