"use client";

import { FilterSelect } from "@/components/shared/filter-sheet";
import { adminDatePeriod, adminDatePeriodLabels } from "../../admin-date-period";
import type { AdminFilterState } from "@/types/domain";

const periods = adminDatePeriod.options.map(value => ({ value, label: adminDatePeriodLabels[value] }));

export function PeriodFilter({ dateFieldLabel, value, onChange }: {
  dateFieldLabel: string;
  value: NonNullable<AdminFilterState["period"]>;
  onChange: (value: NonNullable<AdminFilterState["period"]>) => void;
}) {
  return <FilterSelect label={`Período (${dateFieldLabel})`} value={value} options={periods}
    onChange={period => onChange(adminDatePeriod.parse(period))} />;
}
