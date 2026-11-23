import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { LiveOverviewScreen } from "@/features/overview/components/live-overview-screen";
import { onboardingDestination } from "@/lib/auth-navigation";
import { loadDashboardOverview } from "@/lib/server/dashboard";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Início",
};

export default async function InicioPage() {
  const user = await requireSession("/inicio");
  const destination = onboardingDestination(user);
  if (destination && (destination !== "/conta-em-validacao" || user.role !== "MERCHANT")) redirect(destination);
  if (user.role === "ADMIN") redirect("/admin");

  const pending = destination === "/conta-em-validacao";
  const merchant = user.role === "MERCHANT";
  const hasAccess = merchant || Boolean(user.merchantId);
  const data = hasAccess && !pending ? await loadDashboardOverview() : null;

  return (
    <MerchantPanel user={user} restricted={pending}>
      {pending ? (
        <>
          <PanelHeading title="Visão geral" description="Acompanhe o estado da conta e suas operações." />
          <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-labelledby="validation-heading">
            <h2 id="validation-heading" className="text-lg font-semibold">Conta em validação</h2>
            <p className="text-sm text-muted-foreground">Seu e-mail foi confirmado. A conta aguarda liberação.</p>
          </section>
        </>
      ) : hasAccess ? (
        <LiveOverviewScreen data={data} merchantId={user.id} owner={merchant} canReceive={user.role !== "AUDITOR"} />
      ) : (
        <PanelHeading title="Visão geral" description="A conta vinculada está indisponível para operações." />
      )}
    </MerchantPanel>
  );
}
