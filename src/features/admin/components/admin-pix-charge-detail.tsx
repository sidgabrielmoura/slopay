"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Copy, Filter } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { movementOriginLabel } from "../admin-movement-origin";
import { adminChargeStatusLabels, adminPixCharges, type AdminCharge, type AdminChargeStatus } from "../admin-pix-charges";
import { retryAdminRead } from "../admin-query";
import { AdminChargePixCode } from "./admin-charge-pix-code";
import { CompanyField } from "./company-display";
import { MovementBalanceFields } from "./movement-balance-fields";
import { PixPayerFields } from "./pix-payer-fields";

const variants: Record<AdminChargeStatus, BadgeProps["variant"]> = {
  PENDING: "info", OVERDUE: "warning", PROCESSING: "secondary", COMPLETED: "success",
  PARTIALLY_REFUNDED: "warning", REFUNDED: "secondary", REVIEW: "warning", FAILED: "destructive", CANCELLED: "outline",
};

export function AdminChargeBadge({ status }: { status: AdminChargeStatus }) {
  return <Badge variant={variants[status]} className="max-w-full whitespace-normal">{adminChargeStatusLabels[status]}</Badge>;
}

type ScopeCharge = (scope: "companyId" | "accountId", id: string) => void;

function ChargeFacts({ adminId, charge, qrAllowed, onScope }: {
  adminId: string; charge: AdminCharge; qrAllowed: boolean; onScope: ScopeCharge;
}) {
  const { companyId, accountId } = charge;
  const settled = charge.status === "COMPLETED" || charge.status === "PARTIALLY_REFUNDED" || charge.status === "REFUNDED";

  async function copyId() {
    try {
      await navigator.clipboard.writeText(charge.id);
      toast.success("ID da cobrança copiado.");
    } catch {
      toast.error("Não foi possível copiar o ID da cobrança.");
    }
  }

  return (
    <div className="grid min-w-0 gap-5 divide-y divide-border [&>section]:pb-5 [&>section:last-child]:pb-0">
      <section className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-background p-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">Valor da cobrança</p>
            <p className="wrap-anywhere text-2xl font-semibold tabular-nums sm:text-3xl"><PanelAmount cents={charge.amountInCents} /></p>
          </div>
          <AdminChargeBadge status={charge.status} />
        </div>
        <dl className="grid min-w-0 grid-cols-2 gap-4 tabular-nums">
          <CompanyField label="Criada em">{formatDateTime(charge.createdAt)}</CompanyField>
          <CompanyField label="Origem">{movementOriginLabel(charge.origin)}</CompanyField>
          <CompanyField label="Vencimento">{charge.dueDate ? formatDateTime(charge.dueDate, "date-only") : "Aguardando emissão"}</CompanyField>
          {settled && (charge.paidAt || charge.paidDate) &&
            <CompanyField label="Pagamento">{charge.paidAt ? formatDateTime(charge.paidAt) : formatDateTime(charge.paidDate!, "date-only")}</CompanyField>}
          {settled && !charge.paidAt && !charge.paidDate && charge.recordedAt &&
            <CompanyField label="Confirmação registrada">{formatDateTime(charge.recordedAt)}</CompanyField>}
          {settled && charge.netInCents !== null && <CompanyField label="Valor líquido"><PanelAmount cents={charge.netInCents} /></CompanyField>}
          {settled && charge.feeInCents !== null && <CompanyField label="Tarifa registrada"><PanelAmount cents={charge.feeInCents} /></CompanyField>}
          {charge.slopayFeeInCents != null && <CompanyField label="Tarifa Slopay"><PanelAmount cents={charge.slopayFeeInCents} /></CompanyField>}
          {charge.refundedInCents > 0 && <CompanyField label="Total estornado"><PanelAmount cents={charge.refundedInCents} /></CompanyField>}
          {charge.refundPending && <CompanyField label="Estorno"><Badge variant="warning">Em processamento</Badge></CompanyField>}
        </dl>
      </section>

      {qrAllowed && charge.qrAvailable && <AdminChargePixCode adminId={adminId} chargeId={charge.id} />}
      {charge.balance && <MovementBalanceFields balance={charge.balance} />}
      {settled && <PixPayerFields payer={charge.payer} />}

      <section className="grid min-w-0 gap-3">
        <h3 className="text-balance text-sm font-semibold">Empresa e conta</h3>
        <dl className="grid min-w-0 grid-cols-2 gap-4 [&>div:first-child]:col-span-2">
          <CompanyField label="Empresa">{companyId ? (
            <Link className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-primary underline-offset-4 hover:underline" href={`/admin/empresas/${companyId}`}>
              <span className="min-w-0 wrap-anywhere">{charge.company}</span><ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
            </Link>
          ) : charge.company}</CompanyField>
          {charge.cnpj && <CompanyField label="CNPJ">{formatCNPJ(charge.cnpj)}</CompanyField>}
          <CompanyField label="Carteira">{accountId ? (
            <Link className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-primary underline-offset-4 hover:underline" href={`/admin/contas/${accountId}`}>
              <span className="min-w-0 wrap-anywhere">Final {charge.walletSuffix}</span><ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
            </Link>
          ) : `Final ${charge.walletSuffix}`}</CompanyField>
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
        <dl className="grid min-w-0 gap-3">
          <div className="min-w-0 rounded-lg border border-border px-3 pt-2">
            <dt className="text-xs font-medium text-muted-foreground">ID da cobrança</dt>
            <dd className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 wrap-anywhere font-mono text-xs">{charge.id}</span>
              <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0"
                aria-label="Copiar ID da cobrança" onClick={() => void copyId()}><Copy aria-hidden="true" /></Button>
            </dd>
          </div>
          {charge.providerReference && <CompanyField label="ID no provedor"><span className="font-mono text-xs">{charge.providerReference}</span></CompanyField>}
          {charge.description && <CompanyField label="Descrição">{charge.description}</CompanyField>}
        </dl>

      </section>
    </div>
  );
}

export function PixChargeDetails({ adminId, id, onScope }: { adminId: string; id: string; onScope: ScopeCharge }) {
  const charge = useQuery({
    queryKey: ["admin-pix-charge", adminId, id],
    queryFn: ({ signal }) => adminPixCharges.detail(id, signal),
    staleTime: 10_000, refetchInterval: 20_000, retry: retryAdminRead,
  });
  const missing = charge.error instanceof ApiError && charge.error.status === 404;
  const denied = charge.error instanceof ApiError && [401, 403].includes(charge.error.status);
  return (
    <>
      <ToastNotice message={charge.error?.message} />
      {charge.isPending && <p role="status" className="sr-only">Carregando dados da cobrança</p>}
      <SkeletonReveal flow revealed={!charge.isPending} skeleton={
        <div className="grid gap-3">
          <Skeleton className="h-24 animate-none" /><Skeleton className="h-16 animate-none" /><Skeleton className="h-20 animate-none" />
        </div>
      }>
        {charge.data && !missing && !denied ? <ChargeFacts adminId={adminId} charge={charge.data} qrAllowed={!charge.isError} onScope={onScope} /> : charge.isError && (
          <div className="grid justify-items-start gap-3">
            <p className="text-pretty text-sm text-muted-foreground">{missing ? "Cobrança Pix não encontrada." : "Não foi possível carregar os detalhes."}</p>
            {!missing && <Button type="button" variant="outline" className="h-11" onClick={() => void charge.refetch()}>Tentar novamente</Button>}
          </div>
        )}
      </SkeletonReveal>
    </>
  );
}
