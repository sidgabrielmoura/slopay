import { redirect } from "next/navigation";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { loadDashboardOverview } from "@/lib/server/dashboard";
import { requireSession } from "@/lib/server/session";
import { canActInSupport } from "@/lib/support-scope";
import { LivePixOperations, type PixPageView } from "./live-pix-operations";

const pages = {
  receive: { path: "/pix/receber", title: "Receber Pix", description: "Gere cobranças e acompanhe o pagamento em um só lugar." },
  withdraw: { path: "/pix/saque-direto", title: "Sacar Pix", description: "Transfira saldo para uma chave Pix e acompanhe a confirmação." },
} satisfies Record<PixPageView, { path: string; title: string; description: string }>;

export async function LivePixPage({ view }: { view: PixPageView }) {
  const page = pages[view];
  const user = await requireSession(page.path, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  const canUsePix = (user.role === "MERCHANT" || (user.role === "OPERATOR" && view === "receive" && Boolean(user.merchantId))) &&
    canActInSupport(user.support, "payments");
  const overview = canUsePix ? await loadDashboardOverview() : null;
  return (
    <MerchantPanel user={user}>
      <PanelHeading title={page.title} description={canUsePix ? page.description : "Confira as permissões do seu perfil para esta operação."} />
      {canUsePix && (
        <LivePixOperations key={user.id + ":" + view} merchantId={user.id} view={view}
          environment={overview?.environment ?? "live"}
          receiveAvailable={!!overview?.pixReceiveAvailable} withdrawAvailable={!!overview?.pixWithdrawAvailable}
          unavailable={!overview} />
      )}
    </MerchantPanel>
  );
}
