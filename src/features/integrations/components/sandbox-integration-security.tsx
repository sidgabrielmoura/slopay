"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Network, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-client";
import { apiAccessDraftSchema, integrationApiGateway, type ApiAccessDraft } from "../sandbox-api";
import { IntegrationConfirmationDialog } from "./integration-confirmation-dialog";
import { IntegrationHeading } from "./integration-heading";

export function SandboxIntegrationSecurity({ accountId, canManage = true }: { accountId: string; canManage?: boolean }) {
  const development = useDevelopmentFeatures();
  const queryClient = useQueryClient();
  const gateway = integrationApiGateway(development);
  const key = ["integration-api-security", accountId, development] as const;
  const security = useQuery({ queryKey: key, queryFn: ({ signal }) => gateway.security(signal), retry: false });
  const editor = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState<{ version: number; text: string } | null>(null);
  const [review, setReview] = useState<ApiAccessDraft | null>(null);
  const data = security.data;
  const access = data?.access;

  function reviewChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const networks = editing.text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const draft = apiAccessDraftSchema.safeParse({ version: editing.version, networks });
    if (!draft.success) {
      toast.error("Informe até 20 IPs ou intervalos CIDR, um por linha.");
      return;
    }
    setReview(draft.data);
  }

  return (
    <div className="grid min-w-0 gap-5">
      <IntegrationHeading title="Segurança da integração" description="Controle o acesso das chaves de API da empresa." />
      {security.isPending ? (
        <Card className="grid gap-3 p-5" aria-busy="true" aria-label="Carregando segurança da integração">
          <Skeleton className="h-6 w-44" /><Skeleton className="h-32 w-full" />
        </Card>
      ) : !data || !access ? (
        <Card>
          <Empty icon={<ShieldCheck aria-hidden="true" />} className="rounded-none border-0"
            title={security.data ? (development ? "Conta Sandbox aguardando vínculo" : "Cadastro aguardando aprovação") : "Segurança da integração indisponível"}
            description={security.data
              ? (development ? "A equipe do Slopay precisa vincular a conta." : "O acesso é liberado após a conclusão da abertura da conta.")
              : security.error instanceof ApiError && security.error.status === 404
                ? "A área de segurança aparece quando a API estiver habilitada neste ambiente." : "Tente carregar as configurações novamente."}
            action={security.isError && <Button variant="outline" onClick={() => void security.refetch()}>Tentar novamente</Button>} />
        </Card>
      ) : (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="flex items-center gap-2"><Network size={18} aria-hidden="true" /> IPs permitidos</CardTitle>
                  <TooltipProvider delayDuration={150}>
                    <HelpTooltip label="Como funcionam os IPs permitidos?" className="pointer-coarse:size-11">
                      A lista vale para todas as chaves de API da empresa. Com IPs cadastrados, requisições de outros endereços
                      recebem erro <strong>403 (acesso negado)</strong>. Com a lista vazia, uma chave válida pode ser usada de qualquer IP.
                    </HelpTooltip>
                  </TooltipProvider>
                </div>
                <Badge variant={access.networks.length ? "success" : "secondary"}>
                  {access.networks.length ? "Restrição ativa" : "Qualquer IP"}
                </Badge>
              </div>
            </CardHeader>
            {(canManage || access.networks.length > 0) && (
              <CardContent className="grid min-w-0 gap-4">
                {access.networks.length > 0 && (
                  <ul className="grid divide-y rounded-lg border text-sm" aria-label="IPs cadastrados">
                    {access.networks.map((value) => <li key={value} className="wrap-anywhere px-3 py-2.5 font-mono">{value}</li>)}
                  </ul>
                )}
                {canManage && <Button type="button" ref={editor} variant="outline" className="justify-self-start" onClick={() => {
                  setEditing(editing ? null : { version: access.version, text: access.networks.join("\n") });
                }}>{editing ? "Cancelar edição" : "Editar IPs"}</Button>}
                {canManage && editing && (
                  <form className="grid gap-3 border-t pt-4" onSubmit={reviewChange}>
                    <label htmlFor="integration-networks" className="text-sm font-medium">Endereços IP</label>
                    <Textarea id="integration-networks" aria-describedby="integration-networks-help" rows={5} spellCheck={false}
                      value={editing.text} maxLength={1_300} className="font-mono"
                      onChange={(event) => setEditing({ version: editing.version, text: event.target.value })} />
                    <p id="integration-networks-help" className="text-sm text-muted-foreground">Informe um IP ou intervalo CIDR por linha.</p>
                    <Button className="justify-self-start" type="submit">Revisar alterações</Button>
                  </form>
                )}
              </CardContent>
            )}
          </Card>
          <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Limites de requisições</CardTitle>
              <CardDescription>Janela de {data.limits.windowSeconds} segundos</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4"><dt>Por chave</dt><dd className="tabular-nums">{data.limits.requestsPerKey}</dd></div>
                <div className="flex justify-between gap-4 border-t pt-3"><dt>Por empresa</dt><dd className="tabular-nums">{data.limits.requestsPerCompany}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Saques pela API</CardTitle>
              <CardDescription>{data.withdrawalsEnabled ? "Solicitações de saque habilitadas."
                : "Consulte a equipe do Slopay sobre os limites e as carteiras habilitadas para a conta."}</CardDescription>
            </CardHeader>
            <CardContent><Button asChild variant="outline"><Link href="/aprovacoes">Ver aprovações</Link></Button></CardContent>
          </Card>
          </div>
        </div>
      )}
      {canManage && review && <IntegrationConfirmationDialog scope={JSON.stringify(review)} title="Confirmar IPs permitidos"
        description="Revise a lista que será aplicada às chaves da empresa." completed="IPs atualizados"
        options={() => gateway.options(review)} apply={(proof) => gateway.update(review, proof)}
        onSuccess={(result) => { queryClient.setQueryData(key, result); setEditing(null); }}
        onClose={() => setReview(null)} restoreFocus={() => editor.current?.focus()}>
        {review.networks.length ? <ul className="grid gap-1 rounded-lg border p-3 font-mono text-sm">
          {Array.from(new Set(review.networks)).map((network) => <li key={network} className="wrap-anywhere">{network}</li>)}
        </ul> : <p className="text-sm text-muted-foreground">Com a lista vazia, uma chave válida pode ser usada de qualquer IP.</p>}
      </IntegrationConfirmationDialog>}
    </div>
  );
}
