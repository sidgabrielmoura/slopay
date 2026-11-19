import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { LiveTaxesAndLimitsScreen } from "@/features/account/components/live-taxes-and-limits-screen";
import { taxesAndLimitsPath } from "@/features/account/pix-conditions";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Taxas e limites" };

export default async function TaxesAndLimitsPage({ searchParams }: {
  searchParams: Promise<{ aba?: string | string[] }>;
}) {
  const { aba } = await searchParams;
  const returnTo = aba === "limites" ? taxesAndLimitsPath + "?aba=limites" : taxesAndLimitsPath;
  const user = await requireSession(returnTo, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  return (
    <MerchantPanel user={user}>
      {user.role === "MERCHANT" ? (
        <LiveTaxesAndLimitsScreen key={user.id} merchantId={user.id} />
      ) : (
        <PanelHeading title="Taxas e limites" description="A consulta das condições Pix está disponível para o perfil de lojista." />
      )}
    </MerchantPanel>
  );
}
