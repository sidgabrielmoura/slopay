import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supportActivitySchema, supportHref } from "@/features/admin/account-support";
import { companiesPath } from "@/features/admin/admin-companies";
import { AdminPreferencesProvider } from "@/features/admin/components/admin-preferences-provider";
import { AccountSupportScreen } from "@/features/admin/components/account-support-screen";
import { requestBackend } from "@/lib/server/auth-backend";
import { overviewSchema } from "@/lib/server/dashboard";
import { accessCookie, requireSession } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Acesso de suporte",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

const supportOverviewSchema = supportActivitySchema.extend({
  companyId: z.uuid(), companyName: z.string(), ownerName: z.string(), overview: overviewSchema,
});

export default async function SupportAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuidv4().safeParse((await params).id);
  if (!id.success) notFound();
  const admin = await requireSession(supportHref(id.data), { admin: true });
  const accessToken = (await cookies()).get(accessCookie)?.value;
  const result = await requestBackend(`/admin/support/${id.data}/overview`, { method: "GET", accessToken })
    .then(async (response) => response.ok ? supportOverviewSchema.safeParse(await response.json()) : null)
    .catch(() => null);
  if (result?.success && result.data.activeForMs > 0) return (
    <AdminPreferencesProvider accountId={admin.id}>
      <AccountSupportScreen id={id.data} {...result.data} />
    </AdminPreferencesProvider>
  );

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Acesso de suporte indisponível</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">Volte à empresa para abrir uma nova sessão de suporte.</p>
          <Button asChild variant="outline" className="w-fit"><Link href={companiesPath}>Voltar às empresas</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
