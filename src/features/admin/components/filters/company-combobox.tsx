"use client";

import { useQuery } from "@tanstack/react-query";
import { FilterSelect } from "@/components/shared/filter-sheet";
import { useGatewayService } from "@/providers/demo-provider";

export function CompanyCombobox({ value, onChange }: { value: string; onChange: (companyId: string) => void }) {
  const service = useGatewayService();
  const companies = useQuery({
    queryKey: ["demo", "filter-options", "companies"],
    queryFn: () => service.getCompanies({ pageSize: 50 }),
  });

  return <FilterSelect label="Empresa ou credenciado" value={value} onChange={onChange} options={[
    { value: "ALL", label: "Todas as empresas" },
    ...companies.data?.data.map(company => ({ value: company.id, label: company.tradeName + " · " + company.cnpjMasked })) ?? [],
  ]} />;
}
