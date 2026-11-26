"use client";

import { useDevelopmentFeatures } from "@/providers/app-providers";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FilterInput, FilterSelect, FilterSheet, applySearchFilters } from "@/components/shared/filter-sheet";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { openingsPath } from "../account-openings";
import { walletsHref } from "../admin-balance-positions";
import {
  approvalRulesParams, approvalRulesQuery, approvalRulesQueryFrom,
  fetchAdminApprovalRules, ruleStatusFilter, ruleStatusLabels,
  type ApprovalRuleWallet, type ApprovalRulesQuery,
} from "../admin-approval-rules";
import { operationalAccountsPath, operationalSearch } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { adminApprovalHref, adminApprovalQuery } from "../admin-withdrawal-approvals";
import type { AdminIdentity } from "./layout/admin-panel";

const initialQuery = approvalRulesQuery.parse({});
const pendingApprovals = adminApprovalQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const statusOptions = ruleStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : ruleStatusLabels[value].label,
}));

function RuleFilters({ query, onChange }: { query: ApprovalRulesQuery; onChange: (next: ApprovalRulesQuery) => void }) {
  const development = useDevelopmentFeatures();
  const filtered = Boolean(query.search) || query.status !== "ALL";

  return (
    <FilterSheet value={query} defaults={initialQuery} active={filtered}
      onApply={draft => applySearchFilters(draft, operationalSearch, onChange)}>
      {(draft, setDraft) => <>
        <FilterInput label="Buscar carteira" placeholder={development ? "Empresa, titular, CNPJ ou carteira" : "Nome ou ID da carteira"} maxLength={120} value={draft.search}
          onChange={event => setDraft({ ...draft, search: event.target.value })} />
        <FilterSelect label="Situação da validação" options={statusOptions} value={draft.status}
          onChange={value => setDraft({ ...draft, status: ruleStatusFilter.parse(value) })} />
      </>}
    </FilterSheet>
  );
}

function WalletIdentity({ item }: { item: ApprovalRuleWallet }) {
  const development = useDevelopmentFeatures();
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium" title={item.company}>{item.company}</p>
      {item.ownerName && <p className="truncate text-sm text-muted-foreground" title={item.ownerName}>{item.ownerName}</p>}
      <p className="text-xs text-muted-foreground tabular-nums">{development ? (item.cnpj ? formatCNPJ(item.cnpj) : "Pessoa física") + " · " : ""}Final {item.walletSuffix}</p>
    </div>
  );
}

function WalletValidation({ item }: { item: ApprovalRuleWallet }) {
  const { label, variant } = ruleStatusLabels[item.status];
  return (
    <div className="min-w-0 space-y-1">
      <Badge variant={variant} className="max-w-full whitespace-normal">{label}</Badge>
      {item.enabledAt && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Atualizada em <time dateTime={item.enabledAt}>{formatDateTime(item.enabledAt, "date-only")}</time>
        </p>
      )}
    </div>
  );
}

function PendingLink({ item }: { item: ApprovalRuleWallet }) {
  const quantity = count.format(item.awaitingOwner);
  if (!item.awaitingOwner) return <span className="text-sm text-muted-foreground tabular-nums">{quantity}</span>;
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 h-11 max-w-full gap-1 px-2 text-primary tabular-nums">
      <Link href={adminApprovalHref({ ...pendingApprovals, search: item.cnpj ?? item.id })} prefetch={false}
        aria-label={"Ver saques aguardando o titular de " + item.company}>
        {quantity} <ArrowUpRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

function AccountLink({ item }: { item: ApprovalRuleWallet }) {
  return (
    <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground">
      <Link href={operationalAccountsPath + "/" + item.id} prefetch={false} aria-label={"Ver conta de " + item.company}>
        <ChevronRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

function WalletRows({ items }: { items: ApprovalRuleWallet[] }) {
  const development = useDevelopmentFeatures();
  return (
    <>
      <div className="hidden xl:block">
        <Table aria-label="Alçadas por carteira" className="table-fixed">
          <colgroup><col className="w-5/12" /><col className="w-4/12" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">{development ? "Empresa e titular" : "Carteira"}</TableHead>
              <TableHead scope="col">Validação de saque</TableHead>
              <TableHead scope="col" className="whitespace-normal">{development ? "Aguardando titular" : "Aprovação"}</TableHead>
              <TableHead scope="col"><span className="sr-only">Conta operacional</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-3 pl-5"><WalletIdentity item={item} /></TableCell>
              <TableCell className="py-3"><WalletValidation item={item} /></TableCell>
              <TableCell className="py-2">{development ? <PendingLink item={item} /> : "Titular"}</TableCell>
              <TableCell className="px-2 py-2 text-right"><AccountLink item={item} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ul aria-label="Alçadas por carteira" className="min-w-0 divide-y divide-border xl:hidden">
        {items.map((item) => (
          <li key={item.id} className="grid min-w-0 gap-2 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center justify-between gap-2"><WalletIdentity item={item} /><AccountLink item={item} /></div>
            <WalletValidation item={item} />
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2">
              <span className="text-xs text-muted-foreground">{development ? "Aguardando titular" : "Aprovação"}</span>{development ? <PendingLink item={item} /> : <span className="text-sm">Titular</span>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminApprovalRulesScreen({ user }: { user: AdminIdentity }) {
  const development = useDevelopmentFeatures();
  const query = approvalRulesQueryFrom(useSearchParams());
  const filters = approvalRulesParams({ ...query, page: 1 }).toString();
  const result = useQuery({
    queryKey: ["admin-approval-rules", user.id, filters, query.page],
    queryFn: ({ signal }) => fetchAdminApprovalRules(query, signal),
    placeholderData: (previous, prior) => prior?.queryKey[1] === user.id && prior.queryKey[2] === filters ? previous : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: retryAdminRead,
  });
  const denied = result.error instanceof ApiError && [401, 403].includes(result.error.status);
  const report = denied ? undefined : result.data;
  const loading = result.isLoading || result.isPlaceholderData;

  function navigate(next: ApprovalRulesQuery) {
    const params = approvalRulesParams(next);
    window.history.replaceState(null, "", walletsHref("validacao", params));
  }

  return (
    <>
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="approval-rules-wallets">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <h2 id="approval-rules-wallets" className="text-balance text-lg font-semibold">Validação por carteira</h2>
          {report && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {count.format(report.summary.ready)} de {count.format(report.summary.total)} com validação habilitada
            </p>
          )}
          <RuleFilters query={query} onChange={navigate} />
        </header>
        {loading && <span role="status" className="sr-only">Carregando alçadas por carteira</span>}
        <SkeletonReveal flow revealed={!loading} skeleton={
          <div className="divide-y divide-border">{[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-5">
              <Skeleton className="h-4 w-2/5 animate-none" /><Skeleton className="h-4 w-1/5 animate-none" />
            </div>
          ))}</div>
        }>
          {report?.items.length ? <WalletRows items={report.items} /> : report ? (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">{filters ? "Nenhuma carteira para os filtros selecionados" : "Nenhuma carteira vinculada"}</h3>
              {filters ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => navigate(initialQuery)}>Limpar busca e filtros</Button>
              ) : (
                <Button asChild variant="outline" className="h-11"><Link href={development ? openingsPath : "/admin/contas-bolsao"} prefetch={false}>{development ? "Ver abertura de contas" : "Ver contas bolsão"}</Link></Button>
              )}
            </div>
          ) : result.isError && (
            <div className="grid min-h-40 content-center justify-items-center gap-3 px-4 py-6 text-center">
              <h3 className="text-balance text-base font-semibold">Consulta de alçadas indisponível</h3>
              <Button type="button" variant="outline" className="h-11" onClick={() => void result.refetch()}>Tentar novamente</Button>
            </div>
          )}
        </SkeletonReveal>
        {report && report.pagination.total > 0 && (
          <TablePagination {...report.pagination} busy={loading} label="Paginação das alçadas"
            onPageChange={(page) => navigate({ ...query, page })} />
        )}
      </Card>
    </>
  );
}
