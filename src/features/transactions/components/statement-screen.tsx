import { OperationalDataUnavailable } from "@/components/shared/operational-data-unavailable";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { StatementExportDialog } from "./statement-export-dialog";
import { StatementNavigation } from "./statement-navigation";
import { usePreferences } from "@/providers/preferences-provider";
import type { TransactionDirection } from "@/types/domain";
import { liveTransactionStatuses, statementUnavailableMessage, transactionSearchLimit } from "../live-transactions";
import {
  statusPresentation,
  transactionName,
  transactionStatusLabel,
  type StatementStatus,
  type TransactionTab,
} from "../transaction-presentation";

type StatementRow = {
  id: string;
  reference: string;
  direction: TransactionDirection;
  status: StatementStatus;
  counterparty: string;
  counterpartyReference?: string | null;
  document?: string;
  providerId?: string | null;
  endToEndId?: string;
  amountInCents: number;
  netInCents: number | null;
  feeInCents: number | null;
  createdAt: string;
  settledAt?: string | null;
  settledDate?: string | null;
  simulated?: boolean;
};

type StatementPage = {
  environment: "demo" | "sandbox" | "live";
  data: StatementRow[];
  page: number;
  total: number;
  totalPages: number;
  totalInflowInCents: number;
  totalOutflowInCents: number;
  totalFeesInCents: number;
};

type StatementFilters = {
  direction?: TransactionDirection;
  status?: StatementStatus;
  search: string;
  page: number;
};

const demoStatuses = ["COMPLETED", "PENDING_APPROVAL", "PROCESSING", "FAILED", "REJECTED"] as const;

function csvCell(value: string) {
  // Neutralize text that a spreadsheet could evaluate as a formula.
  const escaped = /^[\t\r\n]|^\s*[=+\-@]/.test(value) ? "'" + value : value;
  return '"' + escaped.replaceAll('"', '""') + '"';
}

function csvAmount(cents: number | null) {
  return cents === null ? "" : Math.floor(cents / 100) + "." + String(cents % 100).padStart(2, "0");
}

function exportPage(data: StatementPage) {
  const demo = data.environment === "demo";
  const headers = [
    "Referência Slopay",
    demo ? "EndToEnd ID" : "ID Asaas",
    "Data de criação",
    "Data de liquidação",
    "Tipo",
    "Contraparte",
    "Documento ou destino mascarado",
    "Valor principal (R$)",
    "Valor líquido (R$)",
    "Tarifa (R$)",
    "Status",
    "Ambiente",
  ];
  const rows = data.data.map((tx) => [
    tx.id,
    (demo ? tx.endToEndId : tx.providerId) ?? "",
    formatDateTime(tx.createdAt, "medium"),
    tx.settledAt ? formatDateTime(tx.settledAt) : tx.settledDate ? formatDateTime(tx.settledDate, "date-only") : "",
    tx.simulated ? "Saque Pix simulado" : transactionName(tx.direction),
    tx.counterparty,
    tx.document ?? (tx.direction === "OUT" && !demo ? tx.counterpartyReference ?? "" : ""),
    csvAmount(tx.amountInCents),
    csvAmount(tx.netInCents),
    csvAmount(tx.feeInCents),
    transactionStatusLabel(tx.status, tx.direction),
    demo ? "Demonstração" : data.environment === "sandbox" ? "Asaas Sandbox" : "Produção",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "extrato_pix_" + Date.now() + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StatementScreen({ initialTab, initialSearch = "", merchantId, fetchPage, afterTable, owner = true, available = true }: {
  initialTab: TransactionTab;
  initialSearch?: string;
  merchantId?: string;
  owner?: boolean;
  available?: boolean;
  fetchPage: (filters: StatementFilters, signal: AbortSignal) => Promise<StatementPage>;
  afterTable?: ReactNode;
}) {
  const { hideValues, preferencesReady } = usePreferences();
  const live = merchantId !== undefined;
  const outflow = live && initialTab === "OUT";
  const direction = initialTab === "IN" || initialTab === "OUT" ? initialTab : undefined;
  const [status, setStatus] = useState<StatementStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch.trim());
  const [page, setPage] = useState(1);

  useEffect(() => {
    const nextSearch = searchTerm.trim();
    if (nextSearch === search) return;
    const timer = window.setTimeout(() => {
      setSearch(nextSearch);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, search]);

  const filters = { direction, status: status === "ALL" ? undefined : status, search, page };
  const { data, isError, isFetching, isLoading, error, refetch } = useQuery({
    enabled: available,
    queryKey: live ? ["pix-statement", merchantId, filters] : queryKeys.transactions({ ...filters, pageSize: 10 }),
    queryFn: ({ signal }) => fetchPage(filters, signal),
    staleTime: live ? 0 : 5 * 60_000,
    refetchOnWindowFocus: live,
    retry: false,
    refetchInterval: ({ state }) => live && !state.error && state.data?.data.some(
      (tx) => tx.status === "PENDING" || tx.status === "PROCESSING",
    ) ? 15_000 : false,
  });

  const filtered = Boolean(searchTerm || status !== "ALL");
  const searching = searchTerm.trim() !== search;

  function clearFilters() {
    setSearchTerm("");
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }

  function handleExport() {
    if (!data?.data.length) return;
    if (hideValues || !preferencesReady) {
      toast.error("Desative o modo de privacidade para autorizar a exportação de valores.");
      return;
    }
    exportPage(data);
    toast.success("Página do extrato exportada em CSV.");
  }

  const totals = [
    { label: live ? "Entradas líquidas" : "Total de Entradas", amount: data?.totalInflowInCents, color: "text-[var(--success)]", showSign: true },
    { label: live ? "Saídas concluídas" : "Total de Saídas", amount: data?.totalOutflowInCents, color: "text-foreground" },
    { label: live ? "Tarifas registradas" : "Tarifas do Período", amount: data?.totalFeesInCents, color: "text-muted-foreground" },
  ].slice(outflow ? 1 : 0);

  return (
    <div className="space-y-6">
      <ToastNotice message={isError ? error?.message || statementUnavailableMessage : null} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{outflow ? "Saídas Pix" : "Movimentações Pix"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {outflow ? "Consulte seus saques Pix, status e tarifas." : "Histórico de recebimentos, saídas e tarifas da conta."}
            {data?.environment === "sandbox" && " · Asaas Sandbox"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={!available || isFetching || searching} className="gap-1.5">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Atualizar
          </Button>
          {live ? owner && <StatementExportDialog direction={direction} status={filters.status} search={search} disabled={!available || searching || isError} /> : <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!data?.data.length || searching || !preferencesReady}
            title="Exportar a página atual"
            className="gap-1.5"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Exportar CSV
          </Button>}
        </div>
      </header>

      <StatementNavigation tab={initialTab} receipts={live && owner} />

      <div className={cn("grid grid-cols-1 gap-4", outflow ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        {totals.map(({ label, amount, color, showSign }) => (
          <Card key={label} className="border-border bg-card/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-xl font-bold tabular-nums", color)}>
              {amount === undefined ? "—" : <PanelAmount cents={amount} showSign={showSign} />}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="relative w-full flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={searchTerm}
            maxLength={transactionSearchLimit}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Buscar movimentações"
            placeholder={live ? "Buscar por referência, ID Asaas ou descrição..." : "Buscar por ID, EndToEnd ID, favorecido ou descrição..."}
            className="h-10 bg-card/80 pl-9"
          />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Select
            value={status}
            onValueChange={(value) => {
              const nextStatus = (live ? liveTransactionStatuses : demoStatuses).find((item) => item === value);
              setStatus(nextStatus ?? "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filtrar por status" className="h-10 w-full bg-card/80 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {(live ? liveTransactionStatuses : demoStatuses).map((value) => (
                  <SelectItem key={value} value={value}>{statusPresentation[value].label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {filtered && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-card/80" aria-busy={isFetching}>
        {isLoading ? (
          <div className="space-y-4 p-6" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full motion-reduce:animate-none" />
            ))}
          </div>
        ) : !available ? <OperationalDataUnavailable title="Extrato indisponível" /> : isError && !data ? (
          <div className="p-8">
            <Empty title="Extrato indisponível" />
          </div>
        ) : !data?.data.length ? (
          <div className="p-8">
            <Empty
              title="Nenhuma movimentação encontrada"
              description={filtered ? "Tente ajustar os filtros." : "Nenhuma operação registrada nesta categoria."}
              action={filtered && <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableCaption className="sr-only">Histórico de movimentações Pix</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Data / Hora</TableHead>
                  <TableHead scope="col">Tipo / Direção</TableHead>
                  <TableHead scope="col">Contraparte</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">Valor líquido</TableHead>
                  <TableHead scope="col" className="text-right">Tarifa</TableHead>
                  <TableHead scope="col" className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((tx) => {
                  const incoming = tx.direction === "IN";
                  const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight;
                  const detailHref = "/movimentacoes/" + encodeURIComponent(tx.reference) +
                    (live ? "?origem=" + initialTab : "");
                  return (
                    <TableRow key={tx.reference} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        <time dateTime={tx.createdAt}>{formatDateTime(tx.createdAt, "short")}</time>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full",
                            incoming ? "bg-[var(--success-surface)] text-[var(--success)]" : "bg-secondary text-foreground"
                          )}>
                            <DirectionIcon className="size-3" aria-hidden="true" />
                          </span>
                          <span className="whitespace-nowrap text-xs font-medium">{tx.reference.startsWith("estorno-") ? "Estorno Pix" : tx.simulated ? "Saque Pix simulado" : transactionName(tx.direction)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[220px] min-w-0 flex-col">
                          <span className="truncate text-sm font-medium" title={tx.counterparty}>{tx.counterparty}</span>
                          <span className="truncate text-[11px] text-muted-foreground" title={tx.counterpartyReference || tx.id}>
                            {tx.counterpartyReference || tx.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusPresentation[tx.status].variant} className="whitespace-nowrap text-[11px]">
                          {transactionStatusLabel(tx.status, tx.direction)}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn("whitespace-nowrap text-right text-sm font-semibold tabular-nums",
                        incoming && tx.netInCents !== null ? "text-[var(--success)]" : "text-foreground"
                      )}>
                        <PanelAmount cents={tx.netInCents ?? tx.amountInCents} showSign={incoming && tx.netInCents !== null} />
                        {tx.netInCents === null && <span className="block text-[11px] font-normal text-muted-foreground">Valor principal</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground tabular-nums">
                        {tx.feeInCents === null ? <span aria-label="Tarifa não registrada">—</span> : <PanelAmount cents={tx.feeInCents} />}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="text-xs font-medium text-primary hover:text-primary">
                          <Link href={detailHref} prefetch={live ? false : undefined}>Detalhes</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground">
              <span>Mostrando {data.data.length} de {data.total} registros</span>
              <nav aria-label="Paginação do extrato" className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Página anterior"
                  disabled={data.page <= 1 || searching}
                  onClick={() => setPage(data.page - 1)}
                  className="size-8 p-0"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="font-medium text-foreground">Página {data.page} de {data.totalPages}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Próxima página"
                  disabled={data.page >= data.totalPages || searching}
                  onClick={() => setPage(data.page + 1)}
                  className="size-8 p-0"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </nav>
            </div>
          </>
        )}
      </Card>
      {afterTable}
    </div>
  );
}
