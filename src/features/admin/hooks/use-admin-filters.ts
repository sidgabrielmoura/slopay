"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import type { AdminFilterState } from "@/types/domain";

export interface UseAdminFiltersOptions {
  initialStatus?: string;
  defaultDateField?: string;
  pageSize?: number;
  defaultPageSize?: number;
  defaultPeriod?: AdminFilterState["period"];
}

export function useAdminFilters(options: UseAdminFiltersOptions = {}) {
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<AdminFilterState>({
    period: options.defaultPeriod || "LAST_30_DAYS",
    dateField: options.defaultDateField || "Data de Criação",
    companyIds: [],
    accountIds: [],
    companyId: "ALL",
    accountId: "ALL",
    status: options.initialStatus || "ALL",
    search: "",
    page: 1,
    pageSize: options.defaultPageSize || options.pageSize || 10,
  });

  const setPeriod = useCallback((period: AdminFilterState["period"], start?: string, end?: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        period,
        startDate: start,
        endDate: end,
        customStartDate: start,
        customEndDate: end,
        page: 1,
      }));
    });
  }, []);

  const setCompany = useCallback((companyId: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        companyId,
        companyIds: companyId === "ALL" ? [] : [companyId],
        accountId: "ALL", // reset dependent account when company changes
        accountIds: [],
        page: 1,
      }));
    });
  }, []);

  const setAccount = useCallback((accountId: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        accountId,
        accountIds: accountId === "ALL" ? [] : [accountId],
        page: 1,
      }));
    });
  }, []);

  const setStatus = useCallback((status: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        status,
        page: 1,
      }));
    });
  }, []);

  const setSearch = useCallback((search: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        search,
        page: 1,
      }));
    });
  }, []);

  const setPage = useCallback((page: number) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        page,
      }));
    });
  }, []);

  const resetFilters = useCallback(() => {
    startTransition(() => {
      setFilters({
        period: "LAST_30_DAYS",
        dateField: options.defaultDateField || "Data de Criação",
        companyIds: [],
        accountIds: [],
        companyId: "ALL",
        accountId: "ALL",
        status: options.initialStatus || "ALL",
        search: "",
        page: 1,
        pageSize: options.pageSize || 10,
      });
    });
  }, [options.defaultDateField, options.initialStatus, options.pageSize]);

  return {
    filters,
    isPending,
    setPeriod,
    setCompany,
    setCompanyId: setCompany,
    setAccount,
    setAccountId: setAccount,
    setStatus,
    setSearch,
    setPage,
    resetFilters,
  };
}
