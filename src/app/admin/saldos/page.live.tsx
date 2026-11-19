import type { Metadata } from "next";
import { balancePositionsPath } from "@/features/admin/admin-balance-positions";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminBalancePositionsScreen } from "@/features/admin/components/admin-balance-positions-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Saldos & Posições" };

export default async function AdminBalancePositionsPage() {
  const { id, fullName, email } = await requireSession(balancePositionsPath, { admin: true });
  return (
    <AdminActivityProvider accountId={id}>
      <AdminBalancePositionsScreen user={{ id, fullName, email }} />
    </AdminActivityProvider>
  );
}
