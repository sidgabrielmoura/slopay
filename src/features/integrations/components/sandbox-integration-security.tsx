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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { apiAccessDraftSchema, integrationApiGateway, type ApiAccessDraft } from "../sandbox-api";
import { IntegrationConfirmationDialog } from "./integration-confirmation-dialog";
import { IntegrationHeading } from "./integration-heading";

export function SandboxIntegrationSecurity({ accountId }: { accountId: string }) {
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
      <IntegrationHeading title="Segurança da integração" description="Controle quais redes podem usar as chaves de API da empresa." />
      {security.isPending ? (
        <Card className="grid gap-3 p-5" aria-busy="true" aria-label="Carregando segurança da integração">
          <Skeleton className="h-6 w-44" /><Skeleton className="h-32 w-full" />
        </Card>
      ) : !data || !access ? (
        <Card>
          <Empty icon={<ShieldCheck aria-hidden="true" />} className="rounded-none border-0"
            title={security.data ? (development ? "Conta Sandbox aguardando vínculo" : "Cadastro aguardando aprovação") : "Segurança da integração indisponível"}
            description={security.data || (security.error instanceof ApiError && security.error.status === 404)
              ? (development ? "A equipe do Slopay habilita o acesso da empresa ao Sandbox." : "A integração fica disponível após a habilitação da conta.")
              : "Tente carregar as configurações novamente."}
            action={security.isError && <Button variant="outline" onClick={() => void security.refetch()}>Tentar novamente</Button>} />
        </Card>
      ) : (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2"><Network size={18} aria-hidden="true" /> Redes permitidas</CardTitle>
                <Badge variant={access.networks.length ? "success" : "secondary"}>
                  {access.networks.length ? "Restrição ativa" : "Acesso por chave"}
                </Badge>
              </div>
              <CardDescription>As redes valem para todas as chaves de API da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="grid min-w-0 gap-4">
              {access.networks.length ? (
                <ul className="grid divide-y rounded-lg border text-sm" aria-label="Endereços autorizados">
                  {access.networks.map((value) => <li key={value} className="wrap-anywhere px-3 py-2.5 font-mono">{value}</li>)}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Uma chave válida pode ser usada de qualquer rede.</p>}
              <Button type="button" ref={editor} variant="outline" className="justify-self-start" onClick={() => {
                setEditing(editing ? null : { version: access.version, text: access.networks.join("\n") });
              }}>{editing ? "Cancelar edição" : "Editar redes"}</Button>
              {editing && (
                <form className="grid gap-3 border-t pt-4" onSubmit={reviewChange}>
                  <label htmlFor="integration-networks" className="text-sm font-medium">Endereços IPv4, IPv6 ou CIDR</label>
                  <Textarea id="integration-networks" aria-describedby="integration-networks-help" rows={5} spellCheck={false}
                    value={editing.text} maxLength={1_300} className="font-mono"
                    onChange={(event) => setEditing({ version: editing.version, text: event.target.value })} />
                  <p id="integration-networks-help" className="text-sm text-muted-foreground">Digite uma rede por linha. Deixe vazio para liberar todas as redes.</p>
                  <Button className="justify-self-start" type="submit">Revisar alterações</Button>
                </form>
              )}
            </CardContent>
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
                : "A validação de saques aguarda habilitação pela equipe do Slopay."}</CardDescription>
            </CardHeader>
            <CardContent><Button asChild variant="outline"><Link href="/aprovacoes">Ver aprovações</Link></Button></CardContent>
          </Card>
          </div>
        </div>
      )}
      {review && <IntegrationConfirmationDialog scope={JSON.stringify(review)} title="Confirmar redes permitidas"
        description="Revise a lista que será aplicada às chaves da empresa." completed="Redes atualizadas"
        options={() => gateway.options(review)} apply={(proof) => gateway.update(review, proof)}
        onSuccess={(result) => { queryClient.setQueryData(key, result); setEditing(null); }}
        onClose={() => setReview(null)} restoreFocus={() => editor.current?.focus()}>
        {review.networks.length ? <ul className="grid gap-1 rounded-lg border p-3 font-mono text-sm">
          {Array.from(new Set(review.networks)).map((network) => <li key={network} className="wrap-anywhere">{network}</li>)}
        </ul> : <p className="text-sm text-muted-foreground">Todas as redes terão acesso com uma chave válida.</p>}
      </IntegrationConfirmationDialog>}
    </div>
  );
}
