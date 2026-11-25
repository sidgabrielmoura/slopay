import { redirect } from "next/navigation";
import { developmentFeaturesEnabled } from "@/config/development";
import { walletsHref } from "@/features/admin/admin-balance-positions";
import { adminPageSearchParams } from "@/features/admin/admin-navigation";
import { requireSession } from "@/lib/server/session";

export default async function AdminApprovalRulesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const destination = walletsHref(developmentFeaturesEnabled() ? "validacao" : "saldos", adminPageSearchParams(await searchParams));
  await requireSession(destination, { admin: true });
  redirect(destination);
}
