import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { LiveWithdrawalApprovals } from "@/features/approvals/components/live-withdrawal-approvals";
import { requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Aprovações" };

export default async function ApprovalsPage({ searchParams }: {
  searchParams: Promise<{ regras?: string | string[] }>;
}) {
  const showRule = (await searchParams).regras === "1";
  const user = await requireSession(showRule ? "/aprovacoes?regras=1" : "/aprovacoes", { operations: true });
  if (user.role === "ADMIN") redirect("/admin");

  const rule = (
    <Card>
      <details open={showRule || undefined} className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring sm:px-5 [&::-webkit-details-marker]:hidden">
          Regras de aprovação
          <ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-4 border-t border-border p-4 text-sm sm:px-5">
          <p className="text-pretty font-medium">O titular autoriza saques de qualquer valor.</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <dt className="font-medium">Pelo painel</dt>
              <dd className="text-pretty text-muted-foreground">Confirme com biometria ou com o código do autenticador.</dd>
            </div>
            <div className="grid gap-1">
              <dt className="font-medium">Pela API</dt>
              <dd className="text-pretty text-muted-foreground">O saque aguarda na fila até o titular aprovar ou recusar.</dd>
            </div>
          </dl>
        </div>
      </details>
    </Card>
  );

  return (
    <MerchantPanel user={user}>
      {user.role === "MERCHANT" ? <LiveWithdrawalApprovals accountId={user.id} rule={rule} /> : (
        <div className="grid gap-5">
          <header className="grid gap-1">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Aprovações</h1>
            <p className="text-pretty text-sm text-muted-foreground">A fila e o histórico de decisões estão disponíveis para o titular.</p>
          </header>
          {rule}
        </div>
      )}
    </MerchantPanel>
  );
}
