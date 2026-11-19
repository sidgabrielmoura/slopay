import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveWithdrawalApprovals } from "@/features/approvals/components/live-withdrawal-approvals";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Aprovações" };

export default async function ApprovalsPage() {
  const user = await requireSession("/aprovacoes", { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <MerchantPanel user={user}>
      <LiveWithdrawalApprovals accountId={user.id} />
    </MerchantPanel>
  );
}
