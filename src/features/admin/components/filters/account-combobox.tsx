"use client";

import React, { useState, useEffect } from "react";
import { useGatewayService } from "@/providers/demo-provider";
import type { Account } from "@/types/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet } from "lucide-react";

interface AccountComboboxProps {
  companyId?: string;
  value?: string;
  onChange: (accountId: string) => void;
  allowAll?: boolean;
}

export function AccountCombobox({
  companyId = "ALL",
  value = "ALL",
  onChange,
  allowAll = true,
}: AccountComboboxProps) {
  const service = useGatewayService();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    service.getAccounts({ companyId, pageSize: 50 }).then((res) => {
      setAccounts(res.data);
    });
  }, [service, companyId]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        Conta Operacional
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 min-w-[200px] max-w-[260px] bg-card border-border text-xs text-foreground">
          <Wallet className="size-3.5 mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Todas as contas" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-[300px] text-xs">
          {allowAll && (
            <SelectItem value="ALL" className="text-xs font-medium">
              Todas as Contas
            </SelectItem>
          )}
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id} className="text-xs py-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground font-medium">
                  {a.accountNumber}
                </span>
                {a.companyTradeName && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    ({a.companyTradeName})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
