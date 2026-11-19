"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToastNotice } from "@/components/ui/toast-notice";
import { recentWithdrawalsKey } from "@/features/pix-withdraw/pix-withdrawal-gateway";
import { formatDateTime } from "@/lib/dates";
import { expenseKeys, fetchExpenseItems, saveExpenseCategory } from "../expense-gateway";
import {
  defaultExpensePeriod, expenseCategories, expenseCategoryFilterSchema, expenseCategoryPresentation, expensePeriodLabels, expensePeriods,
  expensePeriodSchema, expensesUnavailable,
  type ExpenseCategory, type ExpenseCategoryFilter, type ExpensePeriod,
} from "../expenses";
import { ExpenseCategoryLabel, ExpenseCategorySelect } from "./expense-category-select";
import { ExpenseCharts } from "./expense-charts";

function ExpenseItems({ merchantId, period, category, onCategoryChange, page, setPage }: {
  merchantId: string;
  period: ExpensePeriod;
  category: ExpenseCategoryFilter | null;
  onCategoryChange: (category: ExpenseCategoryFilter | null) => void;
  page: number;
  setPage: (page: number) => void;
}) {
  const client = useQueryClient();
  const items = useQuery({
    queryKey: expenseKeys.items(merchantId, period, category, page),
    queryFn: ({ signal }) => fetchExpenseItems(period, category, page, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const update = useMutation({
    mutationFn: ({ reference, next }: { reference: string; next: ExpenseCategory | null }) => saveExpenseCategory(reference, next),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: expenseKeys.account(merchantId) }),
        client.invalidateQueries({ queryKey: recentWithdrawalsKey(merchantId) }),
        client.invalidateQueries({ queryKey: ["pix-withdrawal", merchantId] }),
      ]);
      toast.success("Categoria atualizada.");
    },
  });
  const data = items.data;

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Saídas confirmadas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Escolha uma categoria para cada saque quando necessário.</p>
        </div>
        <Select value={category ?? "ALL"} onValueChange={(value) => {
          onCategoryChange(value === "ALL" ? null : expenseCategoryFilterSchema.parse(value));
        }}>
          <SelectTrigger aria-label="Filtrar por categoria" className="h-11 w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">Todas as categorias</SelectItem>
              <SelectItem value="UNCATEGORIZED" textValue={expenseCategoryPresentation.UNCATEGORIZED.label}><ExpenseCategoryLabel category="UNCATEGORIZED" /></SelectItem>
              {expenseCategories.map((key) => <SelectItem key={key} value={key} textValue={expenseCategoryPresentation[key].label}><ExpenseCategoryLabel category={key} /></SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <ToastNotice message={items.isError ? items.error.message || expensesUnavailable : null} />
      <ToastNotice message={update.isError ? update.error.message : null} />
      <CardContent className="px-5 pb-5">
        {items.isPending ? (
          <div aria-busy="true" aria-label="Carregando saídas" className="grid gap-2">
            <Skeleton className="h-12 motion-reduce:animate-none" />
            <Skeleton className="h-12 motion-reduce:animate-none" />
            <Skeleton className="h-12 motion-reduce:animate-none" />
          </div>
        ) : !data ? (
          <div className="grid min-h-32 place-items-center">
            <Button variant="outline" onClick={() => void items.refetch()} disabled={items.isFetching}>Recarregar saídas</Button>
          </div>
        ) : data.total === 0 ? (
          <Empty icon={<ReceiptText aria-hidden="true" />} title="Nenhuma saída encontrada"
            description={category ? "Escolha outra categoria para consultar os saques." : "Os saques confirmados neste período aparecerão aqui."} />
        ) : (
          <>
            <Table className="panel-operation-table min-w-[600px]">
              <TableCaption className="sr-only">Saídas Pix confirmadas no período</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Tarifa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((item) => (
                  <TableRow key={item.reference}>
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                      <time dateTime={item.date}>{formatDateTime(item.date, "date-only")}</time>
                    </TableCell>
                    <TableCell>
                      <Link href={`/movimentacoes/${item.reference}?origem=OUT`} prefetch={false}
                        className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                        {item.simulated ? "Saque Pix simulado" : "Saque Pix"}
                      </Link>
                      <p className="max-w-40 truncate text-xs text-muted-foreground">{item.destination}</p>
                    </TableCell>
                    <TableCell className="w-59">
                      <ExpenseCategorySelect
                        value={item.category}
                        label={"Categoria do saque para " + item.destination + " em " + formatDateTime(item.date, "date-only")}
                        disabled={update.isPending}
                        onChange={(next) => update.mutate({ reference: item.reference, next })}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums"><PanelAmount cents={item.amountInCents} /></TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right text-muted-foreground tabular-nums lg:table-cell">
                      {item.feeInCents === null ? "—" : <PanelAmount cents={item.feeInCents} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
              <p>{data.total} {data.total === 1 ? "saída" : "saídas"}</p>
              {data.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" aria-label="Página anterior"
                    disabled={data.page <= 1 || items.isFetching} onClick={() => setPage(data.page - 1)}>
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="tabular-nums">{data.page} de {data.totalPages}</span>
                  <Button type="button" variant="outline" size="icon" aria-label="Próxima página"
                    disabled={data.page >= data.totalPages || items.isFetching} onClick={() => setPage(data.page + 1)}>
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancialControlScreen({ merchantId }: { merchantId: string }) {
  const [period, setPeriod] = useState(defaultExpensePeriod);
  const [category, setCategory] = useState<ExpenseCategoryFilter | null>(null);
  const [page, setPage] = useState(1);

  function changeCategory(next: ExpenseCategoryFilter | null) {
    setCategory(next);
    setPage(1);
  }

  return (
    <div className="grid min-w-0 gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Controle financeiro</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Acompanhe seus gastos por período. Transferências próprias e tarifas aparecem separadas do total de gastos.
          </p>
        </div>
        <Select value={period} onValueChange={(value) => {
          setPeriod(expensePeriodSchema.parse(value));
          setPage(1);
        }}>
          <SelectTrigger aria-label="Período do controle financeiro" className="h-11 w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {expensePeriods.map((option) => <SelectItem key={option} value={option}>{expensePeriodLabels[option]}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </header>
      <ExpenseCharts merchantId={merchantId} period={period} selected={category}
        onSelect={(next) => changeCategory(category === next ? null : next)} />
      <ExpenseItems merchantId={merchantId} period={period} category={category} onCategoryChange={changeCategory} page={page} setPage={setPage} />
    </div>
  );
}
