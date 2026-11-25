import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveProfileContact, ReloadProfileContact } from "@/features/account/components/live-profile-contact";
import { ProfileLayout } from "@/features/account/components/profile-layout";
import { profilePath } from "@/features/account/profile";
import { loadProfileDetails } from "@/lib/server/profile";
import { requireSession } from "@/lib/server/session";
import { canActInSupport } from "@/lib/support-scope";
import { formatBrazilianInput } from "@/lib/validators";

export const metadata: Metadata = { title: "Perfil" };

const roleNames = { MERCHANT: "Lojista", OPERATOR: "Operador", AUDITOR: "Auditor" };

export default async function ProfilePage() {
  const user = await requireSession(profilePath, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  const profile = await loadProfileDetails();
  const document = profile?.cpfEnding ? (
    <>
      <span aria-hidden="true">•••.•••.•••-{profile.cpfEnding}</span>
      <span className="sr-only">CPF com final {profile.cpfEnding}</span>
    </>
  ) : null;

  return (
    <MerchantPanel user={user}>
      <ProfileLayout
        name={user.fullName}
        email={user.email}
        role={roleNames[user.role]}
        active={user.status === "ACTIVE"}
        emailVerified={user.isEmailVerified}
        securityStatus={user.isTwoFactorEnabled ? "Autenticação em dois fatores ativa" : undefined}
        document={document}
        contact={profile
          ? canActInSupport(user.support, "profile")
            ? <LiveProfileContact key={user.id} userId={user.id} phone={profile.phone} />
            : <p>{formatBrazilianInput("PHONE", profile.phone ?? "") || "Não informado"}</p>
          : <ReloadProfileContact />}
      />
    </MerchantPanel>
  );
}
