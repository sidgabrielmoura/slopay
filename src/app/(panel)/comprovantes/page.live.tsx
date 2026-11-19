import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { Button } from "@/components/ui/button";
import { ReceiptsScreen } from "@/features/receipts/receipts-screen";
import { receiptsPath } from "@/features/receipts/pix-receipt-share";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Comprovantes" };

export default async function ReceiptsPage() {
  const user = await requireSession(receiptsPath, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  return (
    <MerchantPanel user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PanelHeading title="Comprovantes" description="Consulte e compartilhe os comprovantes de recebimentos e saques Pix confirmados." />
        {user.role === "MERCHANT" && (
          <Button asChild variant="outline" className="h-11">
            <Link href="/movimentacoes" prefetch={false}>Ver extrato <ArrowRight aria-hidden="true" /></Link>
          </Button>
        )}
      </div>
      {user.role === "MERCHANT" && <ReceiptsScreen key={user.id} merchantId={user.id} />}
    </MerchantPanel>
  );
}
