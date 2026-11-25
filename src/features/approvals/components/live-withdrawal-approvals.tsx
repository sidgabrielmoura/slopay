"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, RotateCw } from "lucide-react";
import { PanelAmount, PanelPrivacyToggle } from "@/components/layout/panel-privacy";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { usePreferences } from "@/providers/preferences-provider";
import {
  approvalGroupSchema, withdrawalApprovalIdSchema, withdrawalApprovalReviewParam,
  withdrawalApprovalsGateway, withdrawalApprovalsKey, withdrawalApprovalsPath, type ApprovalDecision,
  type ApprovalGroup, type WithdrawalApproval, type WithdrawalApprovalReview,
} from "../sandbox-withdrawal-approvals";

const status: Record<WithdrawalApproval["state"], [string, BadgeProps["variant"]]> = {
  AWAITING_APPROVAL: ["Aguardando aprovação", "warning"], QUEUED: ["Autorizado", "info"],
  SUBMITTING: ["Em processamento", "info"], RECONCILING: ["Em conciliação", "info"],
  PENDING: ["Em processamento", "info"], IN_BANK_PROCESSING: ["Processando no banco", "info"],
  BLOCKED: ["Bloqueado", "warning"], DONE: ["Concluído", "success"], FAILED: ["Falhou", "destructive"],
  CANCELLED: ["Cancelado", "secondary"], REVIEW: ["Em revisão", "warning"],
};

export function LiveWithdrawalApprovals({ accountId, rule }: { accountId: string; rule: ReactNode }) {
  const development = useDevelopmentFeatures();
  const client = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const [group, setGroup] = useState<ApprovalGroup>("pending");
  const [cursors, setCursors] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const linkedSelection = withdrawalApprovalIdSchema.safeParse(params.get(withdrawalApprovalReviewParam)).data;
  const selection = selected ?? linkedSelection;
  const origin = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const before = cursors.at(-1);
  const gateway = withdrawalApprovalsGateway(development);
  const key = withdrawalApprovalsKey(accountId, development);
  const queue = useQuery({
    queryKey: [...key, group, before], queryFn: ({ signal }) => gateway.list(group, before, signal),
    retry: false, staleTime: 15_000, refetchInterval: 15_000,
  });
  const more = queue.data?.nextCursor;

  function closeReview() {
    setSelected(null);
    if (linkedSelection) {
      const search = new URLSearchParams(params.toString());
      search.delete(withdrawalApprovalReviewParam);
      router.replace(withdrawalApprovalsPath + (search.size ? `?${search}` : ""), { scroll: false });
    }
    (origin.current?.isConnected ? origin.current : heading.current)?.focus();
    origin.current = null;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <header className="grid gap-1">
        <h1 ref={heading} tabIndex={-1} className="text-balance text-2xl font-semibold sm:text-3xl">Aprovações</h1>
        <p className="text-pretty text-sm text-muted-foreground">Revise os saques solicitados pela API e acompanhe as decisões registradas.</p>
      </header>
      {rule}
      <Card className="min-w-0 gap-0 py-0">
        <Tabs value={group} onValueChange={(value) => {
          const parsed = approvalGroupSchema.safeParse(value);
          if (parsed.success) { setGroup(parsed.data); setCursors([]); }
        }}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
            <TabsList aria-label="Status das aprovações">
              <TabsTrigger value="pending">Pendentes</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            <Button type="button" size="icon" variant="ghost" aria-label="Atualizar aprovações" disabled={queue.isFetching}
              onClick={() => void queue.refetch()}><RotateCw aria-hidden="true" /></Button>
          </div>
          <TabsContent value={group} className="mt-0">
            {queue.isPending ? (
              <div className="grid gap-3 p-5" aria-busy="true" aria-label="Carregando aprovações">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
              </div>
            ) : queue.isError || !queue.data.items.length ? (
              <Empty className="rounded-none border-0" icon={<ListChecks aria-hidden="true" />}
                title={queue.isError ? "Aprovações indisponíveis" : group === "history" ? "Nenhuma decisão registrada" : "Nenhuma solicitação pendente"}
                description={queue.error instanceof ApiError && queue.error.status === 404
                  ? "A integração de solicitações de saque precisa ser habilitada para esta conta."
                  : queue.isError ? "Atualize para consultar novamente."
                    : group === "pending" && !queue.data?.enabled ? "A conta aguarda a ativação da validação de saques." : undefined} />
            ) : (
              <ul className="divide-y" aria-label={group === "pending" ? "Saques pendentes" : "Decisões registradas"}>
                {queue.data.items.map((item) => {
                  const [label, variant] = item.reason === "REJECTED_BY_OWNER" ? ["Recusado pelo titular", "secondary"] as const : status[item.state];
                  return (
                    <li key={item.id} className="grid min-w-0 items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
                      <div className="grid min-w-0 gap-1 text-sm">
                        <span className="wrap-anywhere font-medium">{item.destination}</span>
                        <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums sm:justify-end">
                        <strong><PanelAmount cents={item.amountInCents} /></strong><Badge variant={variant}>{label}</Badge>
                      </div>
                      {group === "pending" ? <Button type="button" variant="outline" className="justify-self-start"
                        onClick={(event) => { origin.current = event.currentTarget; setSelected(item.id); }}>Revisar</Button>
                        : item.authorizedAt && <Button asChild variant="ghost" className="justify-self-start">
                          <Link href={`/movimentacoes/saque-${item.id}`} prefetch={false}>Ver movimentação</Link>
                        </Button>}
                    </li>
                  );
                })}
              </ul>
            )}
            {(before || more) && <div className="flex justify-end gap-2 border-t p-4" aria-label="Paginação das aprovações">
              <Button variant="outline" disabled={!before || queue.isFetching} onClick={() => setCursors((pages) => pages.slice(0, -1))}>Anterior</Button>
              <Button variant="outline" disabled={!more || queue.isFetching} onClick={() => { if (more) setCursors((pages) => [...pages, more]); }}>Próxima</Button>
            </div>}
          </TabsContent>
        </Tabs>
      </Card>
      {selection && <WithdrawalReview key={selection} accountId={accountId} development={development} id={selection} onClose={closeReview}
        onDecided={() => { setCursors([]); void client.invalidateQueries({ queryKey: key }); }} />}
    </div>
  );
}

function ReviewDetails({ review }: { review: WithdrawalApprovalReview }) {
  const { hideValues, preferencesReady } = usePreferences();
  return (
    <dl className="grid min-w-0 gap-3 rounded-lg border p-3 text-sm">
      <div><dt className="text-muted-foreground">Chave Pix de destino</dt>
        <dd className="mt-1 wrap-anywhere font-medium">{hideValues || !preferencesReady ? review.destination : review.pixKey}</dd></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><dt>Valor do saque</dt><dd className="font-semibold tabular-nums"><PanelAmount cents={review.amountInCents} /></dd></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><dt>Tarifa máxima</dt>
        <dd>{review.feeLimitInCents === null ? "Indisponível" : <PanelAmount cents={review.feeLimitInCents} />}</dd></div>
      {review.feeLimitInCents !== null && <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <dt>Total máximo do débito</dt><dd className="font-semibold tabular-nums"><PanelAmount cents={review.amountInCents + review.feeLimitInCents} /></dd>
      </div>}
    </dl>
  );
}

function WithdrawalReview({ accountId, id, development, onClose, onDecided }: { accountId: string; id: string; development: boolean; onClose: () => void; onDecided: () => void }) {
  const gateway = withdrawalApprovalsGateway(development);
  const [open, setOpen] = useState(true);
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const continuing = useRef(false);
  const details = useQuery({
    queryKey: ["withdrawal-approval-review", accountId, development, id], queryFn: ({ signal }) => gateway.review(id, signal),
    retry: false, gcTime: 0, refetchOnWindowFocus: false,
  });
  const review = details.data;
  function continueWith(next: ApprovalDecision) {
    continuing.current = true;
    setDecision(next);
  }
  if (review && decision) {
    const approved = decision.decision === "APPROVE";
    return (
      <IntegrationConfirmationDialog scope={JSON.stringify([id, decision])} title={approved ? "Autorizar saque" : "Recusar saque"}
        description="Confirme sua identidade para registrar a decisão." completed={approved ? "Saque encaminhado para processamento" : "Solicitação recusada"}
        options={() => gateway.options(id, decision)} apply={(proof) => gateway.decide(id, decision, proof)}
        onSuccess={onDecided} onClose={onClose}><ReviewDetails review={review} /></IntegrationConfirmationDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => { event.preventDefault(); if (!continuing.current) onClose(); }}>
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Revisar saque</DialogTitle>
          <DialogDescription>Confira a chave Pix e o total antes de decidir.</DialogDescription>
        </DialogHeader>
        {details.isPending ? <Skeleton className="h-36 w-full" aria-label="Carregando dados do saque" /> : !review ? (
          <p className="text-sm text-muted-foreground">{details.error instanceof ApiError ? details.error.message : "Não foi possível consultar a solicitação."}</p>
        ) : (
          <div className="grid min-w-0 gap-4">
            <div className="flex justify-end"><PanelPrivacyToggle /></div>
            <ReviewDetails review={review} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => continueWith({ decision: "REJECT" })}>Recusar</Button>
              <Button type="button" disabled={review.feeLimitInCents === null} onClick={() => {
                if (review.feeLimitInCents !== null) continueWith({ decision: "APPROVE", feeLimitInCents: review.feeLimitInCents });
              }}>Autorizar saque</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
