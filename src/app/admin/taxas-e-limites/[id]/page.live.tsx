import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { adminPixFeesPath } from "@/features/admin/admin-pix-fees";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPixFeeAccountScreen } from "@/features/admin/components/admin-pix-fee-account-screen";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Tarifas da carteira" };

export default async function AdminPixFeeAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const accountId = parsed.data.toLowerCase();
  const { id, fullName, email } = await requireSession(`${adminPixFeesPath}/${accountId}`, { admin: true });

  return (
    <AdminActivityProvider accountId={id}>
      <AdminPixFeeAccountScreen user={{ id, fullName, email }} accountId={accountId} />
    </AdminActivityProvider>
  );
}
