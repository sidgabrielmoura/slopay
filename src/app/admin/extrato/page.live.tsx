import { redirect } from "next/navigation";
import { adminPageSearchParams } from "@/features/admin/admin-navigation";
import { pixMovementHref, pixMovementQueryFrom, pixMovementSelection } from "@/features/admin/admin-pix-movements";
import { requireSession } from "@/lib/server/session";

export default async function AdminGlobalStatementPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = adminPageSearchParams(await searchParams);
  filters.set("view", "statement");
  const destination = pixMovementHref(pixMovementQueryFrom(filters), pixMovementSelection(filters));
  await requireSession(destination, { admin: true });
  redirect(destination);
}
