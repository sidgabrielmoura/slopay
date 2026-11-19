import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { LiveAnalyticsScreen } from "@/features/analytics/components/live-analytics-screen";
import { indicatorsPath } from "@/features/analytics/indicators";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Indicadores Pix" };

export default async function IndicatorsPage() {
  const user = await requireSession(indicatorsPath, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <MerchantPanel user={user}>
      {user.role === "MERCHANT" || user.merchantId ? (
        <LiveAnalyticsScreen key={user.id} merchantId={user.id} />
      ) : (
        <PanelHeading title="Indicadores Pix" description="A conta vinculada está indisponível para consulta." />
      )}
    </MerchantPanel>
  );
}
