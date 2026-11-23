import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveWithdrawalApprovals } from "@/features/approvals/components/live-withdrawal-approvals";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Aprovações" };

export default async function ApprovalsPage() {
  const user = await requireSession("/aprovacoes", { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <MerchantPanel user={user}>
      {user.role === "MERCHANT" ? <LiveWithdrawalApprovals accountId={user.id} /> : (
        <Card className="gap-2 p-5">
          <h1 className="text-xl font-semibold">Aprovações</h1>
          <p className="text-sm text-muted-foreground">O titular da conta revisa e decide os saques solicitados pela integração.</p>
        </Card>
      )}
    </MerchantPanel>
  );
}
