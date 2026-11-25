import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { supportScopeCookie } from "@/lib/support-scope";
import { supportHref } from "@/features/admin/account-support";
import { companiesPath } from "@/features/admin/admin-companies";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Acesso de suporte",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function SupportAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuidv4().safeParse((await params).id);
  if (!id.success) notFound();
  await requireSession(supportHref(id.data), { admin: true });
  const current = (await cookies()).get(supportScopeCookie)?.value;
  redirect(current === id.data ? "/inicio" : companiesPath);
}
