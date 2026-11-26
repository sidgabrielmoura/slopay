"use client";

import { FilterInput, FilterSelect, FilterSheet } from "@/components/shared/filter-sheet";
import type { AdminFilterState } from "@/types/domain";
import { AccountCombobox } from "./account-combobox";
import { CompanyCombobox } from "./company-combobox";
import { PeriodFilter } from "./period-filter";

interface AdminFilterBarProps {
  filters: AdminFilterState;
  onSearchChange: (search: string) => void;
  onPeriodChange?: (period: AdminFilterState["period"]) => void;
  onCompanyChange?: (companyId: string) => void;
  onAccountChange?: (accountId: string) => void;
  onStatusChange?: (status: string) => void;
  onReset?: () => void;
  statusOptions?: { value: string; label: string }[];
  dateFieldLabel?: string;
  searchPlaceholder?: string;
  showCompanyFilter?: boolean;
  showAccountFilter?: boolean;
  showPeriodFilter?: boolean;
  extraActions?: React.ReactNode;
}

const defaults = { search: "", status: "ALL", companyId: "ALL", accountId: "ALL", period: "LAST_30_DAYS" as const };

export function AdminFilterBar({
  filters, onSearchChange, onPeriodChange, onCompanyChange, onAccountChange, onStatusChange, onReset, statusOptions,
  dateFieldLabel = "Data de registro", searchPlaceholder = "ID, documento ou nome",
  showCompanyFilter = true, showAccountFilter = true, showPeriodFilter = true, extraActions,
}: AdminFilterBarProps) {
  const value = {
    search: filters.search ?? defaults.search,
    companyId: filters.companyId ?? defaults.companyId,
    accountId: filters.accountId ?? defaults.accountId,
    status: filters.status ?? defaults.status,
    period: filters.period ?? defaults.period,
  };
  const active = value.search !== "" || value.companyId !== "ALL" || value.accountId !== "ALL" ||
    value.status !== "ALL" || value.period !== defaults.period;

  function apply(draft: typeof value) {
    if (draft === defaults && onReset) {
      onReset();
      return;
    }
    if (draft.search !== value.search) onSearchChange(draft.search.trim());
    if (draft.period !== value.period) onPeriodChange?.(draft.period);
    if (draft.companyId !== value.companyId) onCompanyChange?.(draft.companyId);
    if (draft.accountId !== value.accountId || draft.companyId !== value.companyId) onAccountChange?.(draft.accountId);
    if (draft.status !== value.status) onStatusChange?.(draft.status);
  }

  return <div className="flex flex-wrap justify-end gap-2">
    <FilterSheet value={value} defaults={defaults} active={active} onApply={apply}>
      {(draft, setDraft) => <>
        <FilterInput label="Buscar" placeholder={searchPlaceholder} value={draft.search}
          onChange={event => setDraft({ ...draft, search: event.target.value })} />
        {showCompanyFilter && onCompanyChange && <CompanyCombobox value={draft.companyId}
          onChange={companyId => setDraft({ ...draft, companyId, accountId: "ALL" })} />}
        {showAccountFilter && onAccountChange && <AccountCombobox companyId={draft.companyId} value={draft.accountId}
          onChange={accountId => setDraft({ ...draft, accountId })} />}
        {showPeriodFilter && onPeriodChange && <PeriodFilter dateFieldLabel={dateFieldLabel} value={draft.period}
          onChange={period => setDraft({ ...draft, period })} />}
        {Boolean(statusOptions?.length) && onStatusChange && <FilterSelect label="Situação" options={statusOptions ?? []} value={draft.status}
          onChange={status => setDraft({ ...draft, status })} />}
      </>}
    </FilterSheet>
    {extraActions}
  </div>;
}
