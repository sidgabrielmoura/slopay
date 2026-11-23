import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterPasskey } from "@/features/auth/components/register-passkey";
import { authEntry, safeReturnTo } from "@/lib/auth-navigation";
import { requireSession } from "@/lib/server/session";

export default async function AtivarBiometriaPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  const target = typeof returnTo === "string" && returnTo.split("?")[0] !== "/ativar-biometria"
    ? safeReturnTo(returnTo, "") : "";
  const user = await requireSession(authEntry("/ativar-biometria", target || "/inicio"), { operations: true });
  const destination = target || (user.role === "ADMIN" ? "/admin" : "/inicio");

  return (
    <AuthShell>
      <RegisterPasskey userId={user.id} returnTo={destination} />
    </AuthShell>
  );
}
