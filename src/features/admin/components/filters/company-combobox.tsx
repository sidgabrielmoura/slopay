"use client";

import React, { useState, useEffect } from "react";
import { useGatewayService } from "@/providers/demo-provider";
import type { Company } from "@/types/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface CompanyComboboxProps {
  value?: string;
  onChange: (companyId: string) => void;
  allowAll?: boolean;
}

export function CompanyCombobox({
  value = "ALL",
  onChange,
  allowAll = true,
}: CompanyComboboxProps) {
  const service = useGatewayService();
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    service.getCompanies({ pageSize: 50 }).then((res) => {
      setCompanies(res.data);
    });
  }, [service]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        Empresa / Credenciado
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Empresa ou credenciado" className="h-9 min-w-[220px] max-w-[300px] bg-card border-border text-xs text-foreground">
          <Building2 className="size-3.5 mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Todas as empresas" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-[300px] text-xs">
          {allowAll && (
            <SelectItem value="ALL" className="text-xs font-medium">
              Todas as Empresas
            </SelectItem>
          )}
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id} textValue={c.tradeName}>
              {c.tradeName} · {c.cnpjMasked} · {c.legalName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
