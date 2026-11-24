import { AuthShell } from "@/features/auth/components/auth-shell";
import { ExpiredSession } from "@/features/auth/components/expired-session";
import { RenewSession } from "@/features/auth/components/renew-session";
import { safeReturnTo } from "@/lib/auth-navigation";

export default async function RenovarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[]; estado?: string | string[] }>;
}) {
  const { returnTo, estado } = await searchParams;
  const destination = safeReturnTo(typeof returnTo === "string" ? returnTo : undefined);
  if (estado === "expirada") return <ExpiredSession returnTo={destination} />;
  return (
    <AuthShell>
      <RenewSession returnTo={destination} />
    </AuthShell>
  );
}
