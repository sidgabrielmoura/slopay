import { AuthShell, accountSetupSteps } from "@/features/auth/components/auth-shell";
import { LiveRegistration } from "@/features/auth/components/live-auth-forms";

export default async function CriarContaPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const invitation = typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
  return (
    <AuthShell contentMaxWidthClass="max-w-[440px]" progress={{ steps: accountSetupSteps, current: 0 }}>
      <LiveRegistration invitation={invitation} />
    </AuthShell>
  );
}
