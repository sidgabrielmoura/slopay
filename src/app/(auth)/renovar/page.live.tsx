import { AuthShell } from "@/features/auth/components/auth-shell";
import { RenewSession } from "@/features/auth/components/live-auth-forms";
import { safeReturnTo } from "@/lib/auth-navigation";

export default async function RenovarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <AuthShell>
      <RenewSession returnTo={safeReturnTo(typeof returnTo === "string" ? returnTo : undefined)} />
    </AuthShell>
  );
}
