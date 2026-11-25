import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ApprovalRuleChannels } from "../admin-approval-rules";

export function WithdrawalApprovalPolicy({ channels }: { channels?: ApprovalRuleChannels }) {
  return (
    <Card className="min-w-0" aria-labelledby="owner-rule-heading">
      <div className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 id="owner-rule-heading" className="text-balance text-lg font-semibold">O titular é o único aprovador</h2>
          <p className="text-pretty text-sm text-muted-foreground">
            Em qualquer valor, a decisão exige chave de acesso ou código do autenticador.
          </p>
        </div>
      </div>
      <dl className="grid min-w-0 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="min-w-0 space-y-1 px-4 py-4 sm:px-5">
          <dt className="text-sm font-semibold">Saques via API</dt>
          <dd className="text-pretty text-sm text-muted-foreground">O saque fica em espera até o titular aprovar ou recusar.</dd>
          {channels?.api === false && <dd><Badge variant="warning">Saques via API indisponíveis</Badge></dd>}
        </div>
        <div className="min-w-0 space-y-1 px-4 py-4 sm:px-5">
          <dt className="text-sm font-semibold">Saques e lotes no painel</dt>
          <dd className="text-pretty text-sm text-muted-foreground">O titular confirma a operação no momento do envio.</dd>
          {channels?.panelPilot === false && <dd><Badge variant="secondary">Saques pelo painel indisponíveis</Badge></dd>}
        </div>
      </dl>
    </Card>
  );
}
