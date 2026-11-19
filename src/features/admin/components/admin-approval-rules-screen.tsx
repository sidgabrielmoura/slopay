"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { TablePagination } from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/dates";
import { formatCNPJ } from "@/lib/validators";
import { openingsPath } from "../account-openings";
import {
  adminApprovalRulesPath, approvalRulesParams, approvalRulesQuery, approvalRulesQueryFrom,
  fetchAdminApprovalRules, ruleStatusFilter, ruleStatusLabels, type ApprovalRuleChannels,
  type ApprovalRuleWallet, type ApprovalRulesQuery,
} from "../admin-approval-rules";
import { operationalAccountsPath, operationalSearch } from "../admin-operational-accounts";
import { retryAdminRead } from "../admin-query";
import { adminApprovalHref, adminApprovalQuery, adminApprovalsPath } from "../admin-withdrawal-approvals";
import { AdminPanel, type AdminIdentity } from "./layout/admin-panel";

const initialQuery = approvalRulesQuery.parse({});
const pendingApprovals = adminApprovalQuery.parse({});
const count = new Intl.NumberFormat("pt-BR");
const statusOptions = ruleStatusFilter.options.map((value) => ({
  value, label: value === "ALL" ? "Todas as situações" : ruleStatusLabels[value].label,
}));

function OwnerRule({ channels }: { channels?: ApprovalRuleChannels }) {
  return (
    <Card className="min-w-0" aria-labelledby="owner-rule-heading">
      <div className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <h2 id="owner-rule-heading" className="text-balance text-lg font-semibold">O titular é o único aprovador</h2>
          <p className="text-pretty text-sm text-muted-foreground">
            Em qualquer valor, a decisão exige chave de acesso ou código do autenticador.
          </p>
        </div>
      </div>
      <dl className="grid min-w-0 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="min-w-0 space-y-1 px-4 py-4 sm:px-5">
          <dt className="text-sm font-semibold">Saques via API</dt>
          <dd className="text-pretty text-sm text-muted-foreground">O saque fica em espera até o titular aprovar ou recusar.</dd>
          {channels?.api === false && <dd><Badge variant="warning">Integrações Sandbox desativadas</Badge></dd>}
        </div>
        <div className="min-w-0 space-y-1 px-4 py-4 sm:px-5">
          <dt className="text-sm font-semibold">Saques e lotes no painel</dt>
          <dd className="text-pretty text-sm text-muted-foreground">No piloto, o titular confirma a operação no momento do envio.</dd>
          {channels?.panelPilot === false && <dd><Badge variant="secondary">Piloto indisponível no ambiente</Badge></dd>}
        </div>
      </dl>
    </Card>
  );
}

function RuleFilters({ query, onChange }: { query: ApprovalRulesQuery; onChange: (next: ApprovalRulesQuery) => void }) {
  const [draft, setDraft] = useState({ submitted: query.search, value: query.search });
  const input = useRef<HTMLInputElement>(null);
  const search = draft.submitted === query.search ? draft.value : query.search;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = operationalSearch.safeParse(search);
    if (!parsed.success) {
      toast.error("Confira o texto da busca.");
      return;
    }
    setDraft({ submitted: parsed.data, value: parsed.data });
    onChange({ ...query, search: parsed.data, page: 1 });
  }

  return (
    <form role="search" aria-label="Filtrar alçadas por carteira" onSubmit={submit}
      className="grid gap-3 border-y border-border px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:px-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,16rem)]">
      <div className="grid min-w-0 gap-2">
        <label htmlFor="approval-rules-search" className="text-sm font-medium">Buscar carteira</label>
        <div className="flex min-w-0 gap-2">
          <Input id="approval-rules-search" ref={input} type="search" placeholder="Empresa, titular, CNPJ ou carteira"
            maxLength={120} autoComplete="off" className="h-11 min-w-0" value={search}
            onChange={(event) => setDraft({ submitted: query.search, value: event.target.value })} />
          <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Buscar carteira">
            <Search aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        <span id="approval-rules-status" className="text-sm font-medium">Situação da validação</span>
        <GlideSelect aria-labelledby="approval-rules-status" options={statusOptions} size="lg" menuWidth={248} value={query.status}
          onChange={(status) => onChange({ ...query, status: ruleStatusFilter.parse(status), page: 1 })} />
      </div>
      {(query.search || query.status !== "ALL") && (
        <Button type="button" variant="ghost" size="sm" className="-ml-2 h-11 w-fit" onClick={() => {
          setDraft({ submitted: "", value: "" });
          onChange(initialQuery);
          input.current?.focus();
        }}>Limpar filtros</Button>
      )}
    </form>
  );
}

function WalletIdentity({ item }: { item: ApprovalRuleWallet }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate font-medium" title={item.company}>{item.company}</p>
      <p className="truncate text-sm text-muted-foreground" title={item.ownerName}>{item.ownerName}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{(item.cnpj ? formatCNPJ(item.cnpj) : "Pessoa física")} · Final {item.walletSuffix}</p>
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
          Ativada em <time dateTime={item.enabledAt}>{formatDateTime(item.enabledAt, "date-only")}</time>
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
  return (
    <>
      <div className="hidden xl:block">
        <Table aria-label="Alçadas por carteira" className="table-fixed">
          <colgroup><col className="w-5/12" /><col className="w-4/12" /><col /><col className="w-16" /></colgroup>
          <TableHeader className="bg-secondary/20">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="pl-5">Empresa e titular</TableHead>
              <TableHead scope="col">Validação de saque</TableHead>
              <TableHead scope="col" className="whitespace-normal">Aguardando titular</TableHead>
              <TableHead scope="col"><span className="sr-only">Conta operacional</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-3 pl-5"><WalletIdentity item={item} /></TableCell>
              <TableCell className="py-3"><WalletValidation item={item} /></TableCell>
              <TableCell className="py-2"><PendingLink item={item} /></TableCell>
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
              <span className="text-xs text-muted-foreground">Aguardando titular</span><PendingLink item={item} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AdminApprovalRulesScreen({ user }: { user: AdminIdentity }) {
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
  const loading = result.isPending || result.isPlaceholderData;

  function navigate(next: ApprovalRulesQuery) {
    const params = approvalRulesParams(next);
    window.history.replaceState(null, "", adminApprovalRulesPath + (params.size ? "?" + params : ""));
  }

  return (
    <AdminPanel user={user}>
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Regras de Alçada</h1>
            <Badge variant="secondary">Sandbox</Badge>
          </div>
          <p className="text-pretty text-sm text-muted-foreground">Consulte a regra de autorização dos saques e a situação das carteiras vinculadas.</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href={adminApprovalsPath} prefetch={false}>Ver aprovações <ArrowUpRight aria-hidden="true" /></Link>
        </Button>
      </header>
      <OwnerRule channels={report?.channels} />
      <ToastNotice message={result.error?.message} />
      <Card className="min-w-0" aria-labelledby="approval-rules-wallets">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
          <h2 id="approval-rules-wallets" className="text-balance text-lg font-semibold">Validação por carteira</h2>
          {report && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {count.format(report.summary.ready)} de {count.format(report.summary.total)} com validação habilitada
            </p>
          )}
        </header>
        <RuleFilters query={query} onChange={navigate} />
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
                <Button asChild variant="outline" className="h-11"><Link href={openingsPath} prefetch={false}>Ver abertura de contas</Link></Button>
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
    </AdminPanel>
  );
}
