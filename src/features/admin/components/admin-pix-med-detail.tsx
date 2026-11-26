"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { movementOriginLabel } from "../admin-movement-origin";
import {
  adminPixMed, medBalanceLabels, medDirectionLabels, medProviderOutcome, medProviderOutcomeLabels,
  medRequesterKind, medRequesterLabels, medReview, medState, medStateLabels,
  type MedDetail, type MedItem, type MedReview,
} from "../admin-pix-med";
import { pixMovementHref, pixMovementQueryFrom } from "../admin-pix-movements";
import { retryAdminRead } from "../admin-query";
import { CompanyField } from "./company-display";
import { PixPayerFields } from "./pix-payer-fields";

const tones: Record<MedItem["balanceState"], BadgeProps["variant"]> = {
  BLOCKED: "warning", RELEASE_REPORTED: "info", DIVERGENT: "destructive", NO_EVENTS: "secondary",
};
const returnOutcomes: MedReview["providerOutcome"][] = ["RETURNED", "PARTIALLY_RETURNED"];
const reviewOptions = Object.entries(medStateLabels).map(([value, label]) => ({ value, label }));
const requesterOptions = Object.entries(medRequesterLabels).map(([value, label]) => ({ value, label }));
const outcomeOptions = Object.entries(medProviderOutcomeLabels).map(([value, label]) => ({ value, label }));
const refundLabels = { PENDING: "Pendente", CANCELLED: "Cancelado", DONE: "Concluído" };
const missing = "Sem registro";

export function MedBalanceBadge({ state }: { state: MedItem["balanceState"] }) {
  return <Badge variant={tones[state]}>{medBalanceLabels[state]}</Badge>;
}

function Money({ cents }: { cents: number | null }) {
  return cents === null ? missing : <span className="tabular-nums"><PanelAmount cents={cents} /></span>;
}

function Fields({ title, children }: { title: string; children: ReactNode }) {
  return <section className="grid min-w-0 gap-3 border-t border-border pt-4">
    <h3 className="text-balance text-sm font-semibold">{title}</h3>
    <dl className="grid min-w-0 gap-4 sm:grid-cols-2">{children}</dl>
  </section>;
}

function formInitial(detail: MedDetail): MedReview {
  return {
    revision: detail.revision, state: detail.state, requesterKind: detail.requester.kind,
    requesterName: detail.requester.kind === "THIRD_PARTY" ? detail.requester.name ?? undefined : undefined,
    providerProtocol: detail.providerProtocol ?? undefined, providerOutcome: detail.providerOutcome,
    providerReturnInCents: detail.providerReturnInCents ?? undefined,
    responseDueOn: detail.responseDueOn ?? undefined, notes: detail.notes ?? undefined,
  };
}

function ReviewForm({ detail, onSaved }: { detail: MedDetail; onSaved: () => Promise<void> }) {
  const prefix = useId();
  const [draft, setDraft] = useState(() => formInitial(detail));
  const [validation, setValidation] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (review: MedReview) => adminPixMed.review(detail.id, review),
    onSuccess: async (_response, submitted) => {
      setDraft({ ...submitted, operationId: undefined, revision: submitted.revision + 1 });
      toast.success("Revisão registrada.", { icon: <LoadingConfirmation size={20} animate /> });
      await onSaved();
    },
  });
  const clientLinked = Boolean(detail.client || draft.operationId);
  const returned = returnOutcomes.includes(draft.providerOutcome);
  const stale = draft.revision < detail.revision;
  const saved = formInitial(detail);
  const changed = (Object.keys({ ...saved, ...draft }) as (keyof MedReview)[]).some(key => draft[key] !== saved[key]);

  function set<Key extends keyof MedReview>(key: Key, value: MedReview[Key]) {
    setValidation(null);
    setDraft(previous => ({ ...previous, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.revision !== detail.revision || mutation.isPending || !changed) return;
    const prepared = medReview.safeParse(draft);
    if (!prepared.success) {
      setValidation("Confira o ID do Pix, o solicitante, o protocolo, o prazo e as observações da revisão.");
      return;
    }
    mutation.mutate(prepared.data);
  }

  function label(name: string) {
    return prefix + name;
  }

  return <section className="grid min-w-0 gap-3 border-t border-border pt-4">
    <div className="space-y-1">
      <h3 className="text-balance text-sm font-semibold">Revisão do caso</h3>
      <p className="text-pretty text-sm text-muted-foreground">Registre o que foi conferido no canal oficial do provedor. As alterações ficam na auditoria.</p>
    </div>
    <form onSubmit={submit} className="grid min-w-0 gap-3 sm:grid-cols-2">
      {!detail.operationId && <div className="grid gap-2 sm:col-span-2">
        <label htmlFor={label("operation")} className="text-sm font-medium">Vincular ID do Pix no Slopay</label>
        <Input id={label("operation")} value={draft.operationId ?? ""} onChange={event => {
          const operationId = event.target.value.trim() || undefined;
          setDraft(previous => ({ ...previous, operationId, requesterKind: !operationId && previous.requesterKind === "CLIENT"
            ? "UNIDENTIFIED" : previous.requesterKind }));
          setValidation(null);
        }} maxLength={36} autoComplete="off" aria-describedby={label("operation-hint")} />
        <p id={label("operation-hint")} className="text-sm text-muted-foreground">Confira a referência no provedor e descreva a evidência do vínculo nas observações.</p>
      </div>}
      <div className="grid gap-2">
        <span id={label("state")} className="text-sm font-medium">Situação da revisão</span>
        <GlideSelect aria-labelledby={label("state")} size="lg" options={reviewOptions} value={draft.state}
          onChange={value => set("state", medState.parse(value))} />
      </div>
      <div className="grid gap-2">
        <span id={label("requester")} className="text-sm font-medium">Identificação do solicitante</span>
        <GlideSelect aria-labelledby={label("requester")} size="lg" options={requesterOptions.map(option => ({
          ...option, disabled: option.value === "CLIENT" && !clientLinked,
        }))} value={draft.requesterKind} onChange={value => {
          setValidation(null);
          setDraft(previous => ({ ...previous, requesterKind: medRequesterKind.parse(value),
            requesterName: value === "THIRD_PARTY" ? previous.requesterName : undefined }));
        }} />
      </div>
      {draft.requesterKind === "THIRD_PARTY" && <div className="grid gap-2 sm:col-span-2">
        <label htmlFor={label("name")} className="text-sm font-medium">Nome do solicitante</label>
        <Input id={label("name")} value={draft.requesterName ?? ""} maxLength={160} required
          onChange={event => set("requesterName", event.target.value || undefined)} />
      </div>}
      <div className="grid gap-2">
        <label htmlFor={label("protocol")} className="text-sm font-medium">Protocolo do provedor</label>
        <Input id={label("protocol")} maxLength={100} value={draft.providerProtocol ?? ""} required={draft.providerOutcome !== "UNCONFIRMED"}
          onChange={event => set("providerProtocol", event.target.value || undefined)} />
      </div>
      <div className="grid gap-2">
        <label htmlFor={label("deadline")} className="text-sm font-medium">Prazo informado pelo provedor</label>
        <Input id={label("deadline")} type="date" value={draft.responseDueOn ?? ""}
          onChange={event => set("responseDueOn", event.target.value || undefined)} />
      </div>
      <div className="grid gap-2">
        <span id={label("outcome")} className="text-sm font-medium">Resultado conferido</span>
        <GlideSelect aria-labelledby={label("outcome")} size="lg" options={outcomeOptions}
          value={draft.providerOutcome} onChange={value => {
            const providerOutcome = medProviderOutcome.parse(value);
            setValidation(null);
            setDraft(previous => ({ ...previous, providerOutcome,
              providerReturnInCents: returnOutcomes.includes(providerOutcome) ? previous.providerReturnInCents : undefined }));
          }} />
      </div>
      {returned && <div className="grid gap-2">
        <label htmlFor={label("return")} className="text-sm font-medium">Valor devolvido informado</label>
        <CurrencyInput id={label("return")} valueInCents={draft.providerReturnInCents ?? 0}
          maxInCents={detail.operationAmountInCents ?? 2_147_483_647} onValueChange={value => set("providerReturnInCents", value || undefined)} />
      </div>}
      <div className="grid gap-2 sm:col-span-2">
        <label htmlFor={label("notes")} className="text-sm font-medium">Observações da revisão</label>
        <Textarea id={label("notes")} maxLength={1000} value={draft.notes ?? ""}
          required={draft.state === "CLOSED" || Boolean(draft.operationId)} onChange={event => set("notes", event.target.value || undefined)} />
      </div>
      {stale && <div className="space-y-2 sm:col-span-2">
        <p role="alert" className="text-sm text-muted-foreground">Outro administrador atualizou esta revisão.</p>
        <Button type="button" variant="outline" onClick={() => { setDraft(formInitial(detail)); mutation.reset(); }}>Carregar revisão atual</Button>
      </div>}
      {(validation || mutation.isError) && <p role="alert" className="text-sm text-destructive sm:col-span-2">{validation ?? mutation.error?.message}</p>}
      <div className="sm:col-span-2 sm:justify-self-end">
        <Button type="submit" disabled={!changed || draft.revision !== detail.revision || mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar revisão"}
        </Button>
      </div>
    </form>
  </section>;
}

function ProviderFacts({ detail, canReview, onRefresh }: { detail: MedDetail; canReview: boolean; onRefresh: () => void }) {
  const sync = useMutation({
    mutationFn: () => adminPixMed.sync(detail.id),
    onSuccess: onRefresh,
  });
  const snapshot = detail.providerSnapshot;
  const reviewedDate = detail.reviewedAt;
  const newerEvent = detail.lastEventAt && detail.providerCheckedAt &&
    Date.parse(detail.lastEventAt) > Date.parse(detail.providerCheckedAt);
  return <section className="grid min-w-0 gap-3 border-t border-border pt-4">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h3 className="text-balance text-sm font-semibold">Dados do provedor</h3>
        <p className="text-pretty text-sm text-muted-foreground">{detail.providerCheckedAt
          ? `Operação consultada em ${formatDateTime(detail.providerCheckedAt)}.`
          : "A consulta atualiza os dados do Pix original e dos estornos que o provedor disponibiliza."}</p>
        {newerEvent && <p className="text-sm text-muted-foreground">Há notificações posteriores à última consulta.</p>}
      </div>
      {canReview && detail.providerReference && detail.provider.code === "ASAAS" &&
        <Button type="button" variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
          <RefreshCw aria-hidden="true" />{sync.isPending ? "Consultando…" : "Conferir no provedor"}
        </Button>}
    </div>
    {sync.isError && <p role="alert" className="text-sm text-destructive">{sync.error.message}</p>}
    {sync.isSuccess && <p role="status" className="sr-only">Consulta ao provedor concluída.</p>}
    <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
      <CompanyField label="Protocolo MED">{detail.providerProtocol ?? "A confirmar"}</CompanyField>
      <CompanyField label="Prazo de resposta">{detail.responseDueOn ? formatDateTime(detail.responseDueOn, "date-only") : "A confirmar"}</CompanyField>
      <CompanyField label="Resultado registrado pela equipe">{medProviderOutcomeLabels[detail.providerOutcome]}</CompanyField>
      <CompanyField label="Valor devolvido segundo a revisão"><Money cents={detail.providerReturnInCents} /></CompanyField>
      {reviewedDate && <CompanyField label="Última revisão">{detail.reviewedBy ?? "Equipe Slopay"} · {formatDateTime(reviewedDate)}</CompanyField>}
      {detail.notes && <CompanyField label="Observações da revisão" className="whitespace-pre-wrap">{detail.notes}</CompanyField>}
    </dl>
    {snapshot && <dl className="grid min-w-0 gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
      <CompanyField label="Status do Pix no provedor">{snapshot.status}</CompanyField>
      <CompanyField label="Valor original"><Money cents={snapshot.amountInCents} /></CompanyField>
      <CompanyField label="Valor líquido"><Money cents={snapshot.netInCents} /></CompanyField>
      <CompanyField label="Tarifa do provedor"><Money cents={snapshot.feeInCents} /></CompanyField>
      <CompanyField label="Data da operação">{snapshot.date ? formatDateTime(snapshot.date, "date-only") : missing}</CompanyField>
      <CompanyField label="End-to-End do Pix">{snapshot.endToEndId ?? missing}</CompanyField>
      <CompanyField label="ID Pix no provedor">{snapshot.pixId ?? missing}</CompanyField>
      <CompanyField label="Estornos do Pix original">{snapshot.refunds.length || missing}</CompanyField>
      {snapshot.refunds.length > 0 && <CompanyField label="Total de estornos concluídos">
        <Money cents={snapshot.refunds.reduce((cents, item) => item.status === "DONE" ? cents + item.amountInCents : cents, 0)} />
      </CompanyField>}
      {snapshot.refunds.map((refund, i) => <CompanyField key={i} label={`Estorno ${i + 1} · ${refundLabels[refund.status]}`}>
        <Money cents={refund.amountInCents} />
        {refund.requestedAt && <span className="block text-xs text-muted-foreground">{formatDateTime(refund.requestedAt)}</span>}
        {refund.endToEndId && <span className="block font-mono text-xs">{refund.endToEndId}</span>}
      </CompanyField>)}
    </dl>}
  </section>;
}

function EventHistory({ detail, busy, onPage }: { detail: MedDetail; busy: boolean; onPage: (page: number) => void }) {
  return <section className="grid min-w-0 gap-3 border-t border-border pt-4" aria-labelledby="med-history">
    <div className="space-y-1">
      <h3 id="med-history" className="text-balance text-sm font-semibold">Histórico do provedor</h3>
      <p className="text-pretty text-sm text-muted-foreground">As notificações mostram a retenção e a liberação. O resultado da contestação é conferido separadamente.</p>
    </div>
    {!detail.events.length ? <p className="text-sm text-muted-foreground">Ainda não há notificações de saldo neste caso.</p> : <>
      <ul className="grid gap-2">
        {detail.events.map(event => <li key={event.id} className="grid min-w-0 gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{event.type === "BALANCE_VALUE_BLOCKED" ? "Bloqueio informado" : "Liberação informada"}</p>
            <Money cents={event.amountInCents} />
          </div>
          {event.description && <p className="wrap-anywhere text-pretty text-sm text-muted-foreground">{event.description}</p>}
          <dl className="grid gap-3 sm:grid-cols-2">
            <CompanyField label="ID do evento">{event.id}</CompanyField>
            <CompanyField label="Conta no provedor">{event.accountId ?? missing}</CompanyField>
            <CompanyField label="Cobrança no provedor">{event.paymentId ?? missing}</CompanyField>
            <CompanyField label="Data informada">{event.date ? formatDateTime(event.date, "date-only") : missing}</CompanyField>
            <CompanyField label="Horário informado pelo provedor">{event.providerCreatedAt ?? missing}</CompanyField>
            <CompanyField label="Recebido no Slopay">{formatDateTime(event.receivedAt)}</CompanyField>
          </dl>
        </li>)}
      </ul>
      <TablePagination {...detail.eventPagination} busy={busy} label="Paginação dos eventos de MED" onPageChange={onPage} />
    </>}
  </section>;
}

export function AdminPixMedDetail({ adminId, caseId, canReview, canViewOperation, onClose, onRestoreFocus }: {
  adminId: string; caseId: string; canReview: boolean; canViewOperation: boolean;
  onClose: () => void; onRestoreFocus: () => void;
}) {
  const [eventPage, setEventPage] = useState(1);
  const cache = useQueryClient();
  const result = useQuery({
    queryKey: ["admin-med-detail", adminId, caseId, eventPage],
    queryFn: ({ signal }) => adminPixMed.detail(caseId, eventPage, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === adminId && request.queryKey[2] === caseId ? previous : undefined,
    staleTime: 12_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403, 404].includes(result.error.status);
  const detail = denied ? undefined : result.data;

  async function refresh() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["admin-med-detail", adminId, caseId] }),
      cache.invalidateQueries({ queryKey: ["admin-pix-med", adminId] }),
      cache.invalidateQueries({ queryKey: ["admin-med-options", adminId] }),
    ]);
  }

  const movement = detail?.operationId && detail.direction !== "UNKNOWN"
    ? pixMovementHref(pixMovementQueryFrom(new URLSearchParams()), {
      kind: detail.direction === "RECEIVED" ? "RECEIVE" : detail.operation?.batchId ? "BATCH" : "WITHDRAW",
      id: detail.operationId,
    }) : null;

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
      onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}>
      <DialogHeader className="border-b border-border py-4 pl-4 pr-12 text-left sm:pl-6">
        <DialogTitle>Contestação Pix</DialogTitle>
        <DialogDescription>{detail ? medDirectionLabels[detail.direction] + " · " + detail.provider.name : "Detalhes e histórico do caso"}</DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 min-w-0 gap-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
        {result.isPending && <div role="status" className="grid gap-3">
          <span className="sr-only">Carregando detalhes da contestação</span>
          <Skeleton className="h-14 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-24 w-full" />
        </div>}
        {result.isError && <div className="grid justify-items-start gap-2">
          <p role="alert" className="text-sm text-destructive">{result.error.message}</p>
          {!denied && <Button type="button" variant="outline" onClick={() => void result.refetch()}>Tentar novamente</Button>}
        </div>}
        {detail && <>
          <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
            <div className="space-y-2">
              <MedBalanceBadge state={detail.balanceState} />
              <p className="text-sm text-muted-foreground">{medStateLabels[detail.state]}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2">
              <CompanyField label="Bloqueios informados"><Money cents={detail.blockedInCents} /></CompanyField>
              <CompanyField label="Liberações informadas"><Money cents={detail.releasedInCents} /></CompanyField>
            </dl>
          </div>
          <Fields title="Carteira, cliente e solicitante">
            <CompanyField label="Carteira afetada">{detail.wallet.name}</CompanyField>
            <CompanyField label="ID da carteira no provedor">{detail.wallet.reference}</CompanyField>
            <CompanyField label="ID da carteira no Slopay">{detail.wallet.id}</CompanyField>
            <CompanyField label="Cliente vinculado">{detail.client?.name ?? "Sem vínculo"}</CompanyField>
            <CompanyField label="Empresa do cliente">{detail.client?.company ?? missing}</CompanyField>
            <CompanyField label="E-mail do cliente">{detail.clientEmail ?? missing}</CompanyField>
            <CompanyField label="Solicitante do MED">{detail.requester.name ?? "A identificar"}</CompanyField>
            <CompanyField label="Origem do registro">{detail.source === "WEBHOOK" ? "Notificação do provedor" : "Registro da equipe"}</CompanyField>
            <CompanyField label="ID da contestação no Slopay">{detail.id}</CompanyField>
            <CompanyField label="Registrada em">{formatDateTime(detail.createdAt)}</CompanyField>
          </Fields>
          <Fields title="Operação Pix">
            <CompanyField label="ID no Slopay">{detail.operationId ?? "A vincular"}</CompanyField>
            <CompanyField label="Referência no provedor">{detail.providerReference ?? missing}</CompanyField>
            <CompanyField label="End-to-End do Pix">{detail.endToEndId ?? missing}</CompanyField>
            <CompanyField label="Valor da operação"><Money cents={detail.operationAmountInCents} /></CompanyField>
            <CompanyField label="Origem da operação">{movementOriginLabel(detail.operation?.origin)}</CompanyField>
            {detail.operation && <>
              <CompanyField label="Valor líquido"><Money cents={detail.operation.netInCents} /></CompanyField>
              <CompanyField label="Tarifa registrada"><Money cents={detail.operation.feeInCents} /></CompanyField>
              <CompanyField label="Estornos registrados"><Money cents={detail.operation.refundInCents} /></CompanyField>
              <CompanyField label="Confirmação no Slopay">{detail.operation.confirmedAt ? formatDateTime(detail.operation.confirmedAt) : missing}</CompanyField>
              <CompanyField label="Liquidação">{detail.operation.settledAt ? formatDateTime(detail.operation.settledAt) : missing}</CompanyField>
              {detail.operation.destination && <CompanyField label="Chave Pix de destino">{detail.operation.pixKeyType} · {detail.operation.destination}</CompanyField>}
            </>}
            {movement && canViewOperation && <div className="sm:col-span-2">
              <Button asChild variant="outline"><Link href={movement} prefetch={false}>Ver movimentação <ArrowUpRight aria-hidden="true" /></Link></Button>
            </div>}
          </Fields>
          {(detail.direction === "RECEIVED" || detail.providerSnapshot?.payer) &&
            <PixPayerFields payer={detail.providerSnapshot?.payer ?? detail.operation?.payer} />}
          <ProviderFacts detail={detail} canReview={canReview} onRefresh={refresh} />
          <EventHistory detail={detail} busy={result.isFetching} onPage={setEventPage} />
          {canReview && <ReviewForm detail={detail} onSaved={refresh} />}
        </>}
      </div>
    </DialogContent>
  </Dialog>;
}
