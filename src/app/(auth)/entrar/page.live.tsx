import { AuthShell } from "@/features/auth/components/auth-shell";
import { LiveLogin } from "@/features/auth/components/live-auth-forms";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <AuthShell>
      <LiveLogin returnTo={typeof returnTo === "string" ? returnTo : undefined} />
    </AuthShell>
  );
}
