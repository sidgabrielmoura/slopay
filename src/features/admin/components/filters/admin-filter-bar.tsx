"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, RotateCcw } from "lucide-react";
import { PeriodFilter } from "./period-filter";
import { CompanyCombobox } from "./company-combobox";
import { AccountCombobox } from "./account-combobox";
import type { AdminFilterState } from "@/types/domain";

interface StatusOption {
  value: string;
  label: string;
}

interface AdminFilterBarProps {
  filters: AdminFilterState;
  onSearchChange: (search: string) => void;
  onPeriodChange?: (period: any) => void;
  onCompanyChange?: (companyId: string) => void;
  onAccountChange?: (accountId: string) => void;
  onStatusChange?: (status: string) => void;
  onReset?: () => void;
  statusOptions?: StatusOption[];
  dateFieldLabel?: string;
  searchPlaceholder?: string;
  showCompanyFilter?: boolean;
  showAccountFilter?: boolean;
  showPeriodFilter?: boolean;
  extraActions?: React.ReactNode;
}

export function AdminFilterBar({
  filters,
  onSearchChange,
  onPeriodChange,
  onCompanyChange,
  onAccountChange,
  onStatusChange,
  onReset,
  statusOptions,
  dateFieldLabel = "Data de Registro",
  searchPlaceholder = "Buscar por ID, documento, nome ou texto...",
  showCompanyFilter = true,
  showAccountFilter = true,
  showPeriodFilter = true,
  extraActions,
}: AdminFilterBarProps) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    (filters.period && filters.period !== "LAST_30_DAYS") ||
    (filters.companyId && filters.companyId !== "ALL") ||
    (filters.accountId && filters.accountId !== "ALL") ||
    (filters.status && filters.status !== "ALL");

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-card border border-border">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        {/* Busca textual */}
        <div className="flex-1 min-w-[240px] max-w-md flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            Pesquisa Global
          </span>
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-9 pr-8 text-xs bg-background border-border text-foreground"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar pesquisa"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros em Linha */}
        <div className="flex flex-wrap items-end gap-3">
          {showCompanyFilter && onCompanyChange && (
            <CompanyCombobox
              value={filters.companyId || "ALL"}
              onChange={onCompanyChange}
            />
          )}

          {showAccountFilter && onAccountChange && (
            <AccountCombobox
              companyId={filters.companyId}
              value={filters.accountId || "ALL"}
              onChange={onAccountChange}
            />
          )}

          {showPeriodFilter && onPeriodChange && (
            <PeriodFilter
              dateFieldLabel={dateFieldLabel}
              value={filters.period || "LAST_30_DAYS"}
              onChange={onPeriodChange}
            />
          )}

          {onReset && hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-9 text-xs border-border text-muted-foreground hover:text-foreground hover:bg-background"
            >
              <RotateCcw className="size-3.5 mr-1.5" />
              Limpar Filtros
            </Button>
          )}

          {extraActions}
        </div>
      </div>

      {/* Pílulas de Status (se fornecidas) */}
      {statusOptions && statusOptions.length > 0 && onStatusChange && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 overflow-x-auto pb-1">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 shrink-0">
            Status:
          </span>
          {statusOptions.map((opt) => {
            const isSelected = (filters.status || "ALL") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
