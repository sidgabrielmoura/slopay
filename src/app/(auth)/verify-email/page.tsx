import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, accountSetupSteps } from "@/features/auth/components/auth-shell";
import { RegistrationEmailStep } from "@/features/auth/components/registration-email-step";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import { VerifyEmailLink } from "@/features/auth/components/verify-email-link";
import { emailVerificationPath, onboardingDestination, registrationCompletePath } from "@/lib/auth-navigation";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Confirmar e-mail" };

export default async function VerifyEmailPage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const legacyToken = typeof token === "string" ? token.trim() : "";
  const progress = { steps: accountSetupSteps, current: 2 };
  if (legacyToken) {
    return <AuthShell progress={progress}><VerifyEmailLink token={legacyToken} /></AuthShell>;
  }

  const user = await requireSession(emailVerificationPath);
  const destination = onboardingDestination(user);
  if (destination !== emailVerificationPath) redirect(destination ?? registrationCompletePath(user));

  return (
    <AuthShell progress={progress}>
      <SessionMonitor />
      <RegistrationEmailStep key={user.email} userId={user.id} initialEmail={user.email}
        continueTo={registrationCompletePath(user)} allowCorrection={user.role === "MERCHANT"} />
    </AuthShell>
  );
}
