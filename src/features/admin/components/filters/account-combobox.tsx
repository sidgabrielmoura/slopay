"use client";

import { useQuery } from "@tanstack/react-query";
import { FilterSelect } from "@/components/shared/filter-sheet";
import { useGatewayService } from "@/providers/demo-provider";

export function AccountCombobox({ companyId, value, onChange }: {
  companyId: string;
  value: string;
  onChange: (accountId: string) => void;
}) {
  const service = useGatewayService();
  const accounts = useQuery({
    queryKey: ["demo", "filter-options", "accounts", companyId],
    queryFn: () => service.getAccounts({ companyId, pageSize: 50 }),
  });

  return <FilterSelect label="Conta operacional" value={value} onChange={onChange} options={[
    { value: "ALL", label: "Todas as contas" },
    ...accounts.data?.data.map(account => ({
      value: account.id, label: account.companyTradeName ? account.accountNumber + " · " + account.companyTradeName : account.accountNumber,
    })) ?? [],
  ]} />;
}
