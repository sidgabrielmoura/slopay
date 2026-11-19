"use client";

import React from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { useAdminFilters } from "@/features/admin/hooks/use-admin-filters";
import { AdminFilterBar } from "@/features/admin/components/filters/admin-filter-bar";
import { formatCentsToBrl } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Wallet,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Building2,
  TrendingUp,
} from "lucide-react";
import type { Account, AccountOperationalStatus } from "@/types/domain";

export default function AdminSaldosPage() {
  const {
    filters,
    setSearch,
    setCompanyId,
    setAccountId,
    setStatus,
    resetFilters,
  } = useAdminFilters();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "balances", filters],
    queryFn: () => demoRepository.getGlobalBalances(filters),
  });

  const renderStatusBadge = (st?: AccountOperationalStatus) => {
    switch (st) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
            Ativa
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
            Bloqueada / Suspensa
          </Badge>
        );
      case "DEACTIVATED":
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px]">
            Encerrada
          </Badge>
        );
      default:
        return <Badge variant="outline">{st || "Ativa"}</Badge>;
    }
  };

  const accounts = data?.accounts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Posição Consolidada de Saldos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Custódia global, segregação patrimonial e disponibilidade em conta gráfica no ecossistema SloPay.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Saldo Contábil Global (Book)
              </span>
              <div className="text-xl font-bold tracking-tight text-foreground mt-1 font-mono">
                {formatCentsToBrl(data?.totalBookInCents || 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Wallet className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Saldo Retido / Reservado
              </span>
              <div className="text-xl font-bold tracking-tight text-amber-400 mt-1 font-mono">
                {formatCentsToBrl(data?.totalReservedInCents || 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Saldo Disponível para Saque
              </span>
              <div className="text-xl font-bold tracking-tight text-emerald-400 mt-1 font-mono">
                {formatCentsToBrl(data?.totalAvailableInCents || 0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <AdminFilterBar
        filters={filters}
        onSearchChange={setSearch}
        onCompanyChange={setCompanyId}
        onAccountChange={setAccountId}
        onStatusChange={setStatus}
        onReset={resetFilters}
        showPeriodFilter={false}
        searchPlaceholder="Buscar conta ou empresa..."
      />

      {/* Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Empresa Vinculada
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Conta Operacional
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Saldo Contábil
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Saldo Reservado
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Saldo Disponível
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Limite Diário (Consumo)
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium">
                  Status
                </TableHead>
                <TableHead className="text-xs text-muted-foreground font-medium text-right">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={8} className="h-14 text-center">
                      <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/4 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : accounts.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground text-sm"
                  >
                    Nenhuma conta localizada com os filtros informados.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc) => {
                  const usedLimit = acc.usedDailyLimitInCents || 0;
                  const dailyLimit = acc.dailyLimitInCents || 10000000;
                  const percentUsed = Math.min(100, Math.round((usedLimit / dailyLimit) * 100));

                  return (
                    <TableRow
                      key={acc.id}
                      className="border-border hover:bg-secondary/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {acc.companyTradeName || acc.companyName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: {acc.companyId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {acc.accountNumber}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                        {formatCentsToBrl(acc.bookBalanceInCents || acc.settledBalanceInCents || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-400 whitespace-nowrap">
                        {formatCentsToBrl(acc.reservedBalanceInCents || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-400 whitespace-nowrap">
                        {formatCentsToBrl(acc.availableBalanceInCents || acc.currentAvailableBalanceInCents || 0)}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-muted-foreground">
                              {formatCentsToBrl(usedLimit)}
                            </span>
                            <span className="text-foreground font-medium">
                              {percentUsed}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentUsed > 80 ? "bg-amber-500" : "bg-primary"
                                }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{renderStatusBadge(acc.status)}</TableCell>
                      <TableCell className="text-right">
                        <NextLink href={`/admin/contas/${acc.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                          >
                            <Eye className="size-3.5" />
                            Dossiê
                          </Button>
                        </NextLink>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
