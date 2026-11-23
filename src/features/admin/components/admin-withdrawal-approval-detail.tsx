"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { pixKeyLabels } from "@/features/pix-withdraw/pix-withdrawal";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { pixQueryString, pixStatusLabels, pixTransactionsPath } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import {
  adminApprovalHref, adminApprovalQueryFrom, adminWithdrawalApprovals, approvalStates, type AdminApprovalDetail,
} from "../admin-withdrawal-approvals";
import { CompanyField, CompanyReadError } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

function ApprovalHistory({ approval }: { approval: AdminApprovalDetail }) {
  const events: Array<{ label: string; at?: string | null; dateOnly?: boolean }> = [
    { label: "Solicitação recebida via API", at: approval.requestedAt },
  ];

  if (approval.decision === "APPROVED") {
    events.push({ label: "Autorização do titular registrada", at: approval.authorizedAt });
    if (approval.effectiveAt || approval.effectiveDate) {
      events.push({
        label: "Liquidação informada", at: approval.effectiveAt ?? approval.effectiveDate, dateOnly: !approval.effectiveAt,
      });
    }
    if (approval.confirmedAt) {
      events.push({ label: "Confirmação registrada no Slopay", at: approval.confirmedAt });
    } else {
      events.push({ label: pixStatusLabels[approval.execution] });
    }
  } else if (approval.decision === "REJECTED") {
    events.push({ label: "Recusa do titular registrada", at: approval.updatedAt });
  } else {
    events.push({ label: approvalStates[approval.decision].label });
  }

  return (
    <Card className="min-w-0 px-4 py-4 sm:px-5 sm:py-5" aria-labelledby="approval-history">
      <h2 id="approval-history" className="text-balance text-lg font-semibold">Histórico da solicitação</h2>
      <ol className="mt-4 divide-y divide-border">
        {events.map(({ label, at, dateOnly }) => (
          <li key={label} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
            <p className="text-pretty text-sm font-medium">{label}</p>
            {at && <time dateTime={at} className="text-xs tabular-nums text-muted-foreground">{formatDateTime(at, dateOnly ? "date-only" : "medium")}</time>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ApprovalDetails({ approval }: { approval: AdminApprovalDetail }) {
  const development = useDevelopmentFeatures();
  const decision = approvalStates[approval.decision];
  const transactionHref = pixTransactionsPath + pixQueryString(
    { type: "WITHDRAW", period: "ALL", status: "ALL", search: approval.id, page: 1 },
    { kind: "WITHDRAW", id: approval.id },
  );

  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Solicitação de saque</h1>
            {development && <Badge variant="secondary">Sandbox</Badge>}
          </div>
          <p className="wrap-anywhere font-mono text-xs text-muted-foreground">{approval.id}</p>
        </div>
        <Button asChild variant="outline" className="h-11 w-fit">
          <Link href={transactionHref} prefetch={false}>Ver transação Pix <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </header>

      <Card className="min-w-0 overflow-hidden" aria-labelledby="approval-amount">
        <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <section className="min-w-0 space-y-1">
            <h2 id="approval-amount" className="text-sm font-medium text-muted-foreground">Valor solicitado</h2>
            <p className="wrap-anywhere text-2xl font-semibold tabular-nums sm:text-3xl"><PanelAmount cents={approval.amountInCents} /></p>
          </section>
          <dl className="grid min-w-0 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
            <CompanyField label="Decisão do titular"><Badge variant={decision.variant} className="max-w-full whitespace-normal">{decision.label}</Badge></CompanyField>
            {approval.decision === "APPROVED" && <CompanyField label="Execução do saque">{pixStatusLabels[approval.execution]}</CompanyField>}
            {approval.approvedFeeLimitInCents !== null && <CompanyField label="Limite de tarifa autorizado"><PanelAmount cents={approval.approvedFeeLimitInCents} /></CompanyField>}
            {approval.feeInCents !== null && <CompanyField label="Tarifa registrada"><PanelAmount cents={approval.feeInCents} /></CompanyField>}
          </dl>
        </div>
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
          Última atualização em <time className="tabular-nums" dateTime={approval.updatedAt}>{formatDateTime(approval.updatedAt)}</time>
        </div>
      </Card>

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <Card className="min-w-0 px-4 py-4 sm:px-5 sm:py-5" aria-labelledby="approval-origin">
          <h2 id="approval-origin" className="text-balance text-lg font-semibold">Empresa e destino</h2>
          <dl className="mt-4 grid min-w-0 grid-cols-2 gap-4">
            <CompanyField label="Empresa">
              {approval.companyId ? <Link href={`/admin/empresas/${approval.companyId}`} prefetch={false} className="text-primary underline-offset-4 hover:underline">{approval.company}</Link> : approval.company}
            </CompanyField>
            <CompanyField label="Titular">{approval.ownerName}</CompanyField>
            <CompanyField label="Documento"><span className="tabular-nums">{approval.cnpj ? formatCNPJ(approval.cnpj) : "Pessoa física"}</span></CompanyField>
            <CompanyField label="Carteira">
              {approval.accountId ? <Link href={`/admin/contas/${approval.accountId}`} prefetch={false} className="text-primary underline-offset-4 hover:underline">Final {approval.walletSuffix}</Link> : "A definir na autorização"}
            </CompanyField>
            <CompanyField label="Tipo de chave Pix">{pixKeyLabels[approval.pixKeyType]}</CompanyField>
            {approval.destination && <CompanyField label="Chave Pix mascarada"><span className="font-mono text-xs">{approval.destination}</span></CompanyField>}
          </dl>
        </Card>
        <ApprovalHistory approval={approval} />
      </div>
    </div>
  );
}

export function AdminWithdrawalApprovalScreen({ user, approvalId }: { user: AdminIdentity; approvalId: string }) {
  const backHref = adminApprovalHref(adminApprovalQueryFrom(useSearchParams()));
  const result = useQuery({
    queryKey: ["admin-withdrawal-approval", user.id, approvalId],
    queryFn: ({ signal }) => adminWithdrawalApprovals.detail(approvalId, signal),
    staleTime: 15_000, refetchInterval: 30_000, retry: retryAdminRead,
  });
  const status = result.error instanceof ApiError ? result.error.status : null;
  const missing = status === 404;
  const data = missing || status === 401 || status === 403 ? undefined : result.data;

  return (
    <AdminPanel user={user}>
      <Button asChild variant="ghost" className="-ml-2 h-11 w-fit px-2 text-muted-foreground">
        <Link href={backHref} prefetch={false}><ArrowLeft aria-hidden="true" /> Aprovações extraordinárias</Link>
      </Button>
      <ToastNotice message={missing ? null : result.error?.message} />
      {result.isLoading && <p role="status" className="sr-only">Carregando solicitação de saque</p>}
      <SkeletonReveal flow revealed={!result.isLoading} skeleton={
        <div className="grid min-w-0 gap-5">
          <Skeleton className="h-12 w-56 max-w-full animate-none" />
          <Skeleton className="h-32 animate-none rounded-xl" />
          <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-48 animate-none rounded-xl" /><Skeleton className="h-40 animate-none rounded-xl" /></div>
        </div>
      }>
        {data ? <ApprovalDetails approval={data} /> : missing ? (
          <Card className="grid min-h-48 content-center justify-items-center gap-3 p-6 text-center">
            <h1 className="text-balance text-lg font-semibold">Solicitação de aprovação não encontrada</h1>
            <Button asChild variant="outline" className="h-11"><Link href={backHref} prefetch={false}>Voltar às aprovações</Link></Button>
          </Card>
        ) : result.isError && <CompanyReadError title="Não foi possível carregar a solicitação" retry={() => void result.refetch()} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}
