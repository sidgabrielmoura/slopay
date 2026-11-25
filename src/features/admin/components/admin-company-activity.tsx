"use client";

import { useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { adminCompanies, type CompanyAuditItem, type CompanyOperation } from "../admin-companies";
import { retryAdminRead } from "../admin-query";
import { CompanyReadError, CompanyRowsSkeleton } from "./company-display";

type ActivityProps = { adminId: string; companyId: string };
type Page = { page: number; pageSize: number; total: number };
const kinds = { RECEIVE: "Recebimento Pix", WITHDRAW: "Saque Pix", REFUND: "Estorno Pix" };
const statuses = {
  COMPLETED: ["Concluído", "success"],
  PENDING: ["Pendente", "secondary"],
  PROCESSING: ["Processando", "secondary"],
  REVIEW: ["Em revisão", "warning"],
  FAILED: ["Falhou", "destructive"],
  CANCELLED: ["Cancelado", "secondary"],
  AWAITING_APPROVAL: ["Aguardando titular", "warning"],
} as const;

export function CompanyOperations({ adminId, companyId }: ActivityProps) {
  return <LinkedPixHistory adminId={adminId} recordId={companyId} source="company" load={adminCompanies.operations} />;
}

export function LinkedPixHistory({ adminId, recordId, source, load }: {
  adminId: string; recordId: string; source: "company" | "operational-account";
  load: typeof adminCompanies.operations;
}) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: [`admin-${source}-operations`, adminId, recordId, page],
    queryFn: ({ signal }) => load(recordId, page, signal),
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead, placeholderData: keepPreviousData,
  });
  return (
    <AdminRecordActivity title="Movimentações Pix" paginationLabel="Paginação das movimentações" pagination={result.data?.pagination}
      pending={result.isPending} busy={result.isPlaceholderData} error={result.error}
      retry={() => void result.refetch()} onPage={setPage}>
      {result.data?.items.length ? (
        <ul className="divide-y divide-border" aria-label={source === "company" ? "Movimentações da empresa" : "Movimentações da carteira"}>
          {result.data.items.map((item) => <OperationRow key={item.kind + ":" + item.id} operation={item} />)}
        </ul>
      ) : <p className="p-5 text-pretty text-sm text-muted-foreground">Nenhuma movimentação Pix registrada para a conta vinculada.</p>}
    </AdminRecordActivity>
  );
}

function OperationRow({ operation }: { operation: CompanyOperation }) {
  const [label, variant] = statuses[operation.status];
  return (
    <li className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{kinds[operation.kind]}</p>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatDateTime(operation.occurredAt, "medium")}</p>
      </div>
      <div className="min-w-0 text-sm sm:text-right">
        <p className="wrap-anywhere font-semibold tabular-nums"><PanelAmount cents={operation.amountInCents} /></p>
        {operation.feeInCents !== null && (
          <p className="mt-0.5 text-xs text-muted-foreground">Tarifa <PanelAmount cents={operation.feeInCents} /></p>
        )}
      </div>
      <Badge variant={variant} className="w-fit sm:min-w-24 sm:justify-center">{label}</Badge>
    </li>
  );
}

const eventLabels = {
  COMPANY_PROFILE_UPDATED: "Cadastro atualizado",
  COMPANY_ACCESS_CHANGED: "Acesso atualizado",
  ACCOUNT_SUPPORT_ACCESSED: "Acesso de suporte à conta",
  ACCOUNT_SUPPORT_ACTION: "Solicitação durante o suporte",
  SLOPAY_PIX_PRICING_CHANGED: "Tarifa Pix do Slopay alterada",
  ASAAS_CONNECTION_CREATED: "Conta Sandbox vinculada",
  ASAAS_CREDENTIAL_ROTATED: "Credencial da conta atualizada",
  ASAAS_WEBHOOK_TOKEN_ROTATED: "Token de webhook renovado",
} as const;

function eventTitle(event: CompanyAuditItem) {
  if (event.action === "COMPANY_ACCESS_CHANGED") return event.accessStatus === "SUSPENDED" ? "Acesso suspenso" : "Acesso reativado";
  return eventLabels[event.action];
}

export function CompanyAudit({ adminId, companyId }: ActivityProps) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["admin-company-audit", adminId, companyId, page],
    queryFn: ({ signal }) => adminCompanies.audit(companyId, page, signal),
    staleTime: 15_000, retry: retryAdminRead, placeholderData: keepPreviousData,
  });
  return (
    <AdminRecordActivity title="Histórico administrativo" paginationLabel="Paginação da auditoria" pagination={result.data?.pagination}
      pending={result.isPending} busy={result.isPlaceholderData} error={result.error}
      retry={() => void result.refetch()} onPage={setPage}>
      {result.data?.items.length ? (
        <ul className="divide-y divide-border" aria-label="Histórico administrativo da empresa">
          {result.data.items.map((event) => (
            <li key={event.id} className="grid min-w-0 gap-1 px-5 py-4">
              <p className="text-sm font-semibold">{eventTitle(event)}</p>
              <p className="wrap-anywhere text-xs tabular-nums text-muted-foreground">
                {formatDateTime(event.createdAt, "medium")}{event.actor && <> · {event.actor}</>}
              </p>
              {event.reason && <p className="wrap-anywhere whitespace-pre-wrap text-pretty text-sm text-muted-foreground">{event.reason}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="p-5 text-pretty text-sm text-muted-foreground">Nenhum evento administrativo registrado.</p>}
    </AdminRecordActivity>
  );
}

export function AdminRecordActivity({ title, paginationLabel, pagination, pending, busy, error, retry, onPage, children }: {
  title: string; paginationLabel: string; pagination?: Page; pending: boolean; busy: boolean;
  error: Error | null; retry: () => void; onPage: (page: number) => void; children: ReactNode;
}) {
  return (
    <>
      <ToastNotice message={error?.message ?? null} />
      {pending && <p role="status" className="sr-only">Carregando dados</p>}
      <SkeletonReveal flow revealed={!pending} skeleton={<CompanyRowsSkeleton count={3} />}>
        {pagination ? (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b border-border p-5"><h2 className="text-balance text-lg font-semibold">{title}</h2></CardHeader>
            <div aria-busy={busy}>{children}</div>
            <TablePagination {...pagination} busy={busy} label={paginationLabel} onPageChange={onPage} />
          </Card>
        ) : error && <CompanyReadError title="Consulta indisponível" retry={retry} />}
      </SkeletonReveal>
    </>
  );
}
