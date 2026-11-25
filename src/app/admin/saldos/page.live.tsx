import type { Metadata } from "next";
import { developmentFeaturesEnabled } from "@/config/development";
import { balancePositionsPath } from "@/features/admin/admin-balance-positions";
import { adminPageSearchParams } from "@/features/admin/admin-navigation";
import { AdminWalletsScreen } from "@/features/admin/components/admin-pool-accounts-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Carteiras" };

export default async function AdminWalletsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = adminPageSearchParams(await searchParams);
  const { id, fullName, email } = await requireSession(balancePositionsPath + (query.size ? "?" + query : ""), { admin: true });
  return <AdminWalletsScreen user={{ id, fullName, email }} development={developmentFeaturesEnabled()} />;
}
