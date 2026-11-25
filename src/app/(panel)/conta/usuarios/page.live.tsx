import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { profilePath } from "@/features/account/profile";
import { UserIdentity } from "@/features/users/components/user-identity";
import { MerchantTeamScreen } from "@/features/users/components/merchant-team-screen";
import { usersPath } from "@/features/users/user-access";
import { requireSession } from "@/lib/server/session";
import { canActInSupport } from "@/lib/support-scope";

export const metadata: Metadata = { title: "Usuários" };

const roleLabels = { MERCHANT: "Lojista", OPERATOR: "Operador", AUDITOR: "Auditor" };

export default async function UsersPage() {
  const user = await requireSession(usersPath, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <MerchantPanel user={user}>
      <div className="grid min-w-0 gap-5">
        <PanelHeading title="Usuários" description="Consulte seu acesso e as pessoas vinculadas à conta." />
        <Card className="min-w-0">
          <CardHeader className="space-y-0 border-b p-5">
            <h2 className="text-balance text-lg font-semibold">Acesso atual</h2>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <div className="grid min-w-0 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-6">
              <UserIdentity name={user.fullName} email={user.email} current />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{roleLabels[user.role]}</span>
                <Badge variant="success">Ativo</Badge>
              </div>
              <Button asChild variant="outline" className="h-11 justify-self-start">
                <Link href={profilePath} prefetch={false}>Meu perfil <ArrowUpRight aria-hidden="true" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        {user.role === "MERCHANT" && <MerchantTeamScreen ownerId={user.id} canManage={canActInSupport(user.support, "team")} />}
      </div>
    </MerchantPanel>
  );
}
