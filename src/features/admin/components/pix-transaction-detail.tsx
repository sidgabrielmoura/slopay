"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRef } from "react";
import { Copy, ExternalLink, Filter } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import {
  adminPixTransactions, pixKindLabels, pixStatusLabels, type PixTransactionDetail, type PixTransactionId,
  type PixTransactionRow,
} from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import { adminBatchesPath } from "../admin-withdrawal-batches";
import { CompanyField } from "./company-display";

const statusVariants: Record<PixTransactionRow["status"], BadgeProps["variant"]> = {
  COMPLETED: "success", PARTIALLY_REFUNDED: "warning", REFUNDED: "secondary", PENDING: "warning",
  PROCESSING: "info", AWAITING_APPROVAL: "warning", REVIEW: "warning", BLOCKED: "warning",
  FAILED: "destructive", REJECTED: "destructive", CANCELLED: "secondary",
};
const dateLabels = { CREATED: "Criação", SETTLED: "Efetivação", RECORDED: "Registro no Slopay" };
const keyLabels: Record<string, string> = { CPF: "CPF", CNPJ: "CNPJ", EMAIL: "E-mail", PHONE: "Telefone", EVP: "Chave aleatória" };

export function PixTransactionStatus({ item }: { item: PixTransactionRow }) {
  return <Badge className="max-w-full whitespace-normal" variant={statusVariants[item.status]}>{pixStatusLabels[item.status]}</Badge>;
}

function CopyReference({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error("Não foi possível copiar o identificador.");
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border px-3 py-1.5">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 wrap-anywhere font-mono text-xs">{value}</dd>
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-11"
        aria-label={`Copiar ${label}`} onClick={copy}><Copy aria-hidden="true" /></Button>
    </div>
  );
}

function TransactionFacts({ item, onOpen, onScope }: {
  item: PixTransactionDetail;
  onOpen: (id: PixTransactionId) => void;
  onScope: (scope: "accountId" | "companyId", id: string) => void;
}) {
  const { companyId, accountId, originalId } = item;
  return (
    <div className="grid min-w-0 gap-5 divide-y divide-border [&>section]:pb-5 [&>section:last-child]:pb-0">
      <section className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background p-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">Valor bruto</p>
            <p className="wrap-anywhere text-2xl font-semibold tabular-nums sm:text-3xl"><PanelAmount cents={item.amountInCents} /></p>
          </div>
          <div className="flex flex-wrap gap-2"><PixTransactionStatus item={item} />{item.simulated && <Badge variant="outline">Simulação</Badge>}</div>
        </div>
        <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <CompanyField label="Tarifa">{item.feeInCents === null ? "Sem registro" : <span className="tabular-nums"><PanelAmount cents={item.feeInCents} /></span>}</CompanyField>
          {item.netInCents !== null && <CompanyField label="Valor líquido"><span className="tabular-nums"><PanelAmount cents={item.netInCents} /></span></CompanyField>}
          {item.refundedInCents !== null && item.refundedInCents > 0 &&
            <CompanyField label="Total estornado"><span className="tabular-nums"><PanelAmount cents={item.refundedInCents} /></span></CompanyField>}
          <CompanyField label={dateLabels[item.dateSource]}>{formatDateTime(item.occurredAt, item.dateOnly ? "date-only" : "medium")}</CompanyField>
          {item.dateSource !== "CREATED" && item.kind !== "REFUND" && <CompanyField label="Criação">{formatDateTime(item.createdAt)}</CompanyField>}
          {item.requestedAt && <CompanyField label="Solicitação do estorno">{formatDateTime(item.requestedAt)}</CompanyField>}
          {item.refundPending && <CompanyField label="Estorno"><Badge variant="warning">Em processamento</Badge></CompanyField>}
        </dl>
      </section>
      <section className="grid min-w-0 gap-3">
        <h3 className="text-balance text-sm font-semibold">Empresa e conta</h3>
        <dl className="grid min-w-0 grid-cols-2 gap-4 [&>div:first-child]:col-span-2">
          <CompanyField label="Empresa">{companyId ? (
            <Link className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-primary underline-offset-4 hover:underline"
              href={`/admin/empresas/${companyId}`}><span className="min-w-0 wrap-anywhere">{item.company}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" /></Link>
          ) : item.company}</CompanyField>
          {item.cnpj && <CompanyField label="CNPJ">{formatCNPJ(item.cnpj)}</CompanyField>}
          <CompanyField label="Carteira">{accountId ? (
            <Link className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-primary underline-offset-4 hover:underline" href={`/admin/contas/${accountId}`}>
              <span className="min-w-0 wrap-anywhere">Final {item.walletSuffix}</span><ExternalLink className="size-3 shrink-0" aria-hidden="true" />
            </Link>
          ) : `Final ${item.walletSuffix}`}</CompanyField>
          {item.destination && <CompanyField label={item.pixKeyType ? keyLabels[item.pixKeyType] ?? "Chave Pix de destino" : "Chave Pix de destino"}>{item.destination}</CompanyField>}
        </dl>
        {(companyId || accountId) && (
          <div className="flex min-w-0 flex-wrap gap-2">
            {companyId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onScope("companyId", companyId)}>
              <Filter aria-hidden="true" /> Filtrar pela empresa
            </Button>}
            {accountId && <Button type="button" variant="outline" size="sm" className="h-11" onClick={() => onScope("accountId", accountId)}>
              <Filter aria-hidden="true" /> Filtrar pela conta
            </Button>}
          </div>
        )}
      </section>
      <section className="grid min-w-0 gap-3">
        <h3 className="text-balance text-sm font-semibold">Referências</h3>
        <dl className="grid min-w-0 gap-2">
          <CopyReference label="ID Slopay" value={item.id} />
          {item.endToEndId && <CopyReference label="EndToEnd ID" value={item.endToEndId} />}
          {item.providerReference && <CopyReference label="ID no provedor" value={item.providerReference} />}
          {item.batchId && <CompanyField label={item.batchPosition ? `Lote · Item ${item.batchPosition}` : "Lote"}>
            <Link className="text-primary underline-offset-4 hover:underline" href={`${adminBatchesPath}/${item.batchId}`} prefetch={false}>{item.batchId}</Link>
          </CompanyField>}
          {item.description && <CompanyField label="Descrição">{item.description}</CompanyField>}
        </dl>
        {originalId && (
          <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => onOpen({ kind: "RECEIVE", id: originalId })}>
            Ver recebimento original
          </Button>
        )}
      </section>
    </div>
  );
}

function DetailLoad({ adminId, selection, onOpen, onScope }: {
  adminId: string;
  selection: PixTransactionId;
  onOpen: (id: PixTransactionId) => void;
  onScope: (scope: "accountId" | "companyId", id: string) => void;
}) {
  const detail = useQuery({
    queryKey: ["admin-pix-transaction", adminId, selection.kind, selection.id],
    queryFn: ({ signal }) => adminPixTransactions.detail(selection, signal),
    staleTime: 10_000, retry: retryAdminRead,
  });
  const status = detail.error instanceof ApiError ? detail.error.status : null;
  const missing = status === 404;
  const data = missing || status === 401 || status === 403 ? undefined : detail.data;

  return (
    <>
      <ToastNotice message={detail.error?.message} />
      {detail.isPending && <p role="status" className="sr-only">Carregando detalhes da transação</p>}
      <SkeletonReveal flow revealed={!detail.isPending} skeleton={
        <div className="grid gap-3">
          <Skeleton className="h-24 animate-none" /><Skeleton className="h-20 animate-none" /><Skeleton className="h-16 animate-none" />
        </div>
      }>
        {data ? <TransactionFacts item={data} onOpen={onOpen} onScope={onScope} /> : detail.error && (
          <div className="grid justify-items-start gap-3">
            <p className="text-pretty text-sm text-muted-foreground">{missing ? "Transação Pix não encontrada." : "Não foi possível carregar os detalhes."}</p>
            {!missing && <Button type="button" variant="outline" className="h-11" onClick={() => void detail.refetch()}>Tentar novamente</Button>}
          </div>
        )}
      </SkeletonReveal>
    </>
  );
}

export function PixTransactionDialog({ adminId, selection, onClose, onRestoreFocus, onOpen, onScope }: {
  adminId: string;
  selection: PixTransactionId | undefined;
  onClose: () => void;
  onRestoreFocus: () => void;
  onOpen: (id: PixTransactionId) => void;
  onScope: (scope: "accountId" | "companyId", id: string) => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog open={Boolean(selection)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(38rem,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
        onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}
        onOpenAutoFocus={(event) => { event.preventDefault(); title.current?.focus({ preventScroll: true }); }}>
        <DialogHeader className="border-b border-border py-4 pr-12 pl-4 text-left sm:pl-6">
          <DialogTitle ref={title} tabIndex={-1} className="text-balance text-xl outline-none">{selection ? pixKindLabels[selection.kind] : "Detalhes da transação"}</DialogTitle>
          <DialogDescription>Dados da movimentação registrada no Slopay.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {selection && <DetailLoad key={`${selection.kind}:${selection.id}`} adminId={adminId} selection={selection} onScope={onScope}
            onOpen={(reference) => { title.current?.focus(); onOpen(reference); }} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
