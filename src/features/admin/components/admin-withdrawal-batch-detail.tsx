"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { expenseCategoryPresentation } from "@/features/expenses/expenses";
import { pixKeyLabels, withdrawalStatusLabel } from "@/features/pix-withdraw/pix-withdrawal";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { pixQueryString, pixTransactionsPath } from "../admin-pix-transactions";
import { retryAdminRead } from "../admin-query";
import {
  adminBatchHref, adminBatchPage, adminBatchQueryFrom, adminWithdrawalBatches,
  type AdminBatchTransfer, type AdminWithdrawalBatchDetail,
} from "../admin-withdrawal-batches";
import { AdminBatchBadge } from "./admin-withdrawal-batches-screen";
import { CompanyField, CompanyReadError, CompanyRowsSkeleton } from "./company-display";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

function TransferBadge({ state }: { state: AdminBatchTransfer["state"] }) {
  if (state === "AWAITING_APPROVAL") return <Badge variant="warning">Aguardando titular</Badge>;
  if (state === "REJECTED") return <Badge variant="destructive">Recusado pelo titular</Badge>;
  const variant = state === "DONE" ? "success" : state === "FAILED" ? "destructive"
    : state === "REVIEW" || state === "BLOCKED" ? "warning" : "secondary";
  return <Badge variant={variant} className="max-w-full whitespace-normal">{withdrawalStatusLabel({ state })}</Badge>;
}

function TransferDestination({ item }: { item: AdminBatchTransfer }) {
  return <div className="min-w-0 space-y-0.5">
    <p className="wrap-anywhere font-medium">Pix {item.position} · {item.destination ?? "Destino indisponível"}</p>
    <p className="text-xs text-muted-foreground">{pixKeyLabels[item.pixKeyType]}</p>
  </div>;
}

function TransferConfirmation({ item }: { item: AdminBatchTransfer }) {
  const date = item.effectiveAt ?? item.effectiveDate ?? item.confirmedAt;
  if (!date) return <span className="text-muted-foreground">—</span>;
  const calendarDay = !item.effectiveAt && Boolean(item.effectiveDate);
  const recorded = !item.effectiveAt && !item.effectiveDate;
  return <div className="text-xs tabular-nums text-muted-foreground">
    <time dateTime={date}>{formatDateTime(date, calendarDay ? "date-only" : "medium")}</time>
    {recorded && <p className="mt-0.5">Registro no Slopay</p>}
  </div>;
}

function TransferLink({ item }: { item: AdminBatchTransfer }) {
  const href = pixTransactionsPath + pixQueryString(
    { type: "BATCH", status: "ALL", search: item.id, period: "ALL", page: 1 }, { kind: "BATCH", id: item.id },
  );
  return <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground">
    <Link href={href} prefetch={false} aria-label={`Ver movimentação do Pix ${item.position}`}><ArrowUpRight aria-hidden="true" /></Link>
  </Button>;
}

function TransferRows({ transfers }: { transfers: AdminBatchTransfer[] }) {
  return <>
    <div className="hidden min-w-0 xl:block">
      <Table className="table-fixed" aria-label="Transferências do lote">
        <colgroup>
          <col className="w-[24%]" /><col className="w-[13%]" /><col className="w-[18%]" /><col className="w-[15%]" />
          <col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[6%]" />
        </colgroup>
        <TableHeader className="bg-secondary/20">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">Destino</TableHead><TableHead scope="col">Categoria</TableHead><TableHead scope="col">Situação</TableHead>
            <TableHead scope="col">Confirmação</TableHead><TableHead scope="col" className="text-right">Valor</TableHead>
            <TableHead scope="col" className="text-right">Tarifa</TableHead><TableHead scope="col"><span className="sr-only">Detalhes</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{transfers.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="py-2.5"><TransferDestination item={item} /></TableCell>
            <TableCell className="wrap-anywhere py-2.5 text-xs text-muted-foreground">{item.expenseCategory ? expenseCategoryPresentation[item.expenseCategory].label : "Sem categoria"}</TableCell>
            <TableCell className="py-2.5"><TransferBadge state={item.state} /></TableCell>
            <TableCell className="py-2.5"><TransferConfirmation item={item} /></TableCell>
            <TableCell className="wrap-anywhere py-2.5 text-right font-semibold tabular-nums"><PanelAmount cents={item.amountInCents} /></TableCell>
            <TableCell className="wrap-anywhere py-2.5 text-right text-xs tabular-nums text-muted-foreground">
              {item.feeInCents === null ? "—" : <PanelAmount cents={item.feeInCents} />}
            </TableCell>
            <TableCell className="px-1 py-2 text-center"><TransferLink item={item} /></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
    <ul aria-label="Transferências do lote" className="min-w-0 divide-y divide-border xl:hidden">{transfers.map((item) => (
      <li key={item.id} className="grid min-w-0 gap-2.5 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center justify-between gap-2"><TransferDestination item={item} /><TransferLink item={item} /></div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] items-start gap-2">
          <p className="wrap-anywhere text-sm text-muted-foreground">{item.expenseCategory ? expenseCategoryPresentation[item.expenseCategory].label : "Sem categoria"}</p>
          <div className="min-w-0 text-right tabular-nums">
            <p className="wrap-anywhere text-sm font-semibold"><PanelAmount cents={item.amountInCents} /></p>
            {item.feeInCents !== null && <p className="wrap-anywhere text-xs text-muted-foreground">Tarifa <PanelAmount cents={item.feeInCents} /></p>}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <TransferBadge state={item.state} />
          {(item.effectiveAt || item.effectiveDate || item.confirmedAt) && <TransferConfirmation item={item} />}
        </div>
      </li>
    ))}</ul>
  </>;
}

function BatchDetails({ batch, listQuery }: {
  batch: AdminWithdrawalBatchDetail["batch"]; listQuery: ReturnType<typeof adminBatchQueryFrom>;
}) {
  const development = useDevelopmentFeatures();
  const progress = `${batch.completedCount} de ${batch.count} Pix liquidados`;
  const states = [[batch.pendingCount, "pendentes"], [batch.reviewCount, "em revisão"], [batch.failedCount, "encerrados"]]
    .filter(([count]) => count).map(([count, label]) => `${count} ${label}`);
  const confirmedDebit = batch.recordedFeesInCents !== null && batch.recordedFeeCount === batch.completedCount
    ? batch.completedAmountInCents + batch.recordedFeesInCents : null;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(batch.id);
      toast.success("ID do lote copiado.");
    } catch {
      toast.error("Não foi possível copiar o ID do lote.");
    }
  }

  return <>
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 wrap-anywhere text-balance text-2xl font-semibold sm:text-3xl">{batch.title || "Detalhes do lote"}</h1>
          <AdminBatchBadge state={batch.state} />{development && <Badge variant="outline">{batch.simulated ? "Simulação" : "Sandbox"}</Badge>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">Criado em <time className="tabular-nums" dateTime={batch.createdAt}>{formatDateTime(batch.createdAt)}</time></p>
      </div>
      <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => void copyId()}><Copy aria-hidden="true" /> Copiar ID do lote</Button>
    </header>

    <Card className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-4 px-4 pt-4 sm:px-5 sm:pt-5 lg:grid-cols-2">
        <section className="grid min-w-0 content-start gap-3">
          <div className="space-y-1">
            <h2 className="text-balance text-lg font-semibold">Execução do lote</h2>
            <p className="text-pretty text-sm tabular-nums text-muted-foreground">{[progress, ...states].join(" · ")}</p>
          </div>
          <Progress value={(batch.completedCount / batch.count) * 100} aria-label="Transferências liquidadas"
            getValueLabel={() => progress} indicatorClassName="transition-none" />
        </section>
        <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
          <CompanyField label="Empresa">
            {batch.companyId ? <Link href={`/admin/empresas/${batch.companyId}`} prefetch={false}
              className="text-primary underline-offset-4 hover:underline">{batch.company}</Link> : batch.company}
          </CompanyField>
          <CompanyField label="Carteira">
            {batch.accountId ? <Link href={`/admin/contas/${batch.accountId}`} prefetch={false}
              className="text-primary underline-offset-4 hover:underline">Final {batch.walletSuffix}</Link> : `Final ${batch.walletSuffix}`}
          </CompanyField>
          {batch.cnpj && <CompanyField label="CNPJ">{formatCNPJ(batch.cnpj)}</CompanyField>}
          <CompanyField label="ID do lote"><span className="font-mono text-xs">{batch.id}</span></CompanyField>
        </dl>
      </div>
      {(batch.companyId || batch.accountId) && <div className="flex min-w-0 flex-wrap gap-2 px-4 sm:px-5">
        {batch.companyId && <Button asChild variant="ghost" size="sm" className="h-11">
          <Link href={adminBatchHref({ ...listQuery, search: "", page: 1, accountId: undefined, companyId: batch.companyId })} prefetch={false}>Lotes da empresa</Link>
        </Button>}
        {batch.accountId && <Button asChild variant="ghost" size="sm" className="h-11">
          <Link href={adminBatchHref({ ...listQuery, search: "", page: 1, accountId: batch.accountId, companyId: undefined })} prefetch={false}>Lotes da carteira</Link>
        </Button>}
      </div>}
      <dl aria-label="Valores do lote" className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t border-border bg-border lg:grid-cols-4">
        {([
          ["Valor solicitado", batch.amountInCents], ["Valor liquidado", batch.completedAmountInCents],
          ["Tarifas registradas", batch.recordedFeesInCents], ["Débito confirmado", confirmedDebit],
        ] as const).map(([label, cents]) => (
          <div key={label} className="min-w-0 space-y-1 bg-card p-4 sm:p-5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="wrap-anywhere text-xl font-semibold tabular-nums">{cents === null
              ? <span aria-label="Valor indisponível">—</span> : <PanelAmount cents={cents} />}</dd>
            {label === "Tarifas registradas" && <dd className="text-xs tabular-nums text-muted-foreground">{batch.recordedFeeCount} de {batch.completedCount} Pix liquidados</dd>}
          </div>
        ))}
      </dl>
    </Card>
  </>;
}

export function AdminWithdrawalBatchScreen({ user, batchId }: { user: AdminIdentity; batchId: string }) {
  const params = useSearchParams();
  const listQuery = adminBatchQueryFrom(params);
  const itemPage = adminBatchPage.catch(1).parse(params.get("itemPage"));
  const backHref = adminBatchHref(listQuery);
  const result = useQuery({
    queryKey: ["admin-withdrawal-batch", user.id, batchId, itemPage],
    queryFn: ({ signal }) => adminWithdrawalBatches.detail(batchId, itemPage, signal),
    placeholderData: (previous, request) => request?.queryKey[1] === user.id && request.queryKey[2] === batchId ? previous : undefined,
    staleTime: 15_000, refetchInterval: 20_000, retry: retryAdminRead,
  });
  const status = result.error instanceof ApiError ? result.error.status : null;
  const missing = status === 404;
  const data = missing || status === 401 || status === 403 ? undefined : result.data;

  return (
    <AdminPanel user={user}>
      <Button asChild variant="ghost" className="-ml-2 h-11 w-fit px-2 text-muted-foreground">
        <Link href={backHref} prefetch={false}><ArrowLeft aria-hidden="true" /> Lotes de saída</Link>
      </Button>
      <ToastNotice message={missing ? null : result.error?.message} />
      {result.isLoading && <p role="status" className="sr-only">Carregando lote de saída</p>}
      <SkeletonReveal flow revealed={!result.isLoading} skeleton={
        <div className="grid min-w-0 gap-5">
          <Skeleton className="h-9 w-48 animate-none" /><Skeleton className="h-44 animate-none rounded-xl" /><CompanyRowsSkeleton />
        </div>
      }>
        {data ? <div className="grid min-w-0 gap-5">
          <BatchDetails batch={data.batch} listQuery={listQuery} />
          <Card className="min-w-0" aria-labelledby="admin-batch-transfers">
            <header className="border-b border-border px-4 py-4 sm:px-5"><h2 id="admin-batch-transfers" className="text-balance text-lg font-semibold">Transferências do lote</h2></header>
            <TransferRows transfers={data.transfers} />
            <TablePagination {...data.pagination} label="Paginação de transferências do lote" busy={result.isPlaceholderData}
              onPageChange={(page) => window.history.replaceState(null, "", adminBatchHref(listQuery, batchId, page))} />
          </Card>
        </div> : missing ? (
          <Card className="grid min-h-48 content-center justify-items-center gap-3 p-6 text-center">
            <h1 className="text-balance text-lg font-semibold">Lote de saída não encontrado</h1>
            <Button asChild variant="outline" className="h-11"><Link href={backHref} prefetch={false}>Voltar aos lotes</Link></Button>
          </Card>
        ) : result.isError && <CompanyReadError title="Não foi possível carregar o lote" retry={() => void result.refetch()} />}
      </SkeletonReveal>
    </AdminPanel>
  );
}
