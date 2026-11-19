import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { MerchantPanel, PanelHeading } from "@/components/layout/merchant-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { approvalRulesPath } from "@/features/approval-rules/approval-rules";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Regras de aprovação" };

export default async function ApprovalRulesPage() {
  const user = await requireSession(approvalRulesPath, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  return (
    <MerchantPanel user={user}>
      <div className="grid min-w-0 gap-5">
        <PanelHeading title="Regras de aprovação" description="Consulte como os saques Pix são aprovados nesta conta." />
        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b p-5">
            <h2 className="text-balance text-lg font-semibold">Alçadas de saque</h2>
            <Badge variant="success">Em vigor</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="grid gap-1"><dt className="text-muted-foreground">Quem aprova</dt><dd className="font-semibold">Titular da conta</dd></div>
              <div className="grid gap-1"><dt className="text-muted-foreground">Faixa de valor</dt><dd className="font-semibold">Todos os valores</dd></div>
              <div className="grid gap-1"><dt className="text-muted-foreground">Envio pelo painel</dt><dd>O titular confirma a operação com biometria ou autenticador.</dd></div>
              <div className="grid gap-1"><dt className="text-muted-foreground">Solicitação pela API</dt><dd>O saque fica pendente até o titular aprovar ou recusar.</dd></div>
            </dl>
            {user.role === "MERCHANT" && <Button asChild variant="outline" className="h-11 justify-self-start">
              <Link href="/aprovacoes" prefetch={false}>Ver fila de aprovações <ArrowUpRight aria-hidden="true" /></Link>
            </Button>}
          </CardContent>
        </Card>
      </div>
    </MerchantPanel>
  );
}
