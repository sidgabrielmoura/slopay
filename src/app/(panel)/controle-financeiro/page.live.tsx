import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { FinancialControlScreen } from "@/features/expenses/components/financial-control-screen";
import { financialControlPath } from "@/features/expenses/expenses";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Controle financeiro" };

export default async function FinancialControlPage() {
  const user = await requireSession(financialControlPath, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  return (
    <MerchantPanel user={user}>
      {user.role === "MERCHANT" ? (
        <FinancialControlScreen merchantId={user.id} />
      ) : (
        <PanelHeading title="Controle financeiro" description="A consulta de saídas está disponível para o perfil de lojista." />
      )}
    </MerchantPanel>
  );
}
