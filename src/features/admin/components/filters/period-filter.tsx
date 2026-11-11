"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface PeriodFilterProps {
  dateFieldLabel?: string;
  value?: string;
  onChange: (period: any) => void;
}

export function PeriodFilter({
  dateFieldLabel = "Data de Registro",
  value = "LAST_30_DAYS",
  onChange,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">
        Período ({dateFieldLabel})
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[190px] bg-card border-border text-xs text-foreground">
          <Calendar className="size-3.5 mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border text-xs">
          <SelectItem value="TODAY">Hoje</SelectItem>
          <SelectItem value="YESTERDAY">Ontem</SelectItem>
          <SelectItem value="LAST_7_DAYS">Últimos 7 dias</SelectItem>
          <SelectItem value="LAST_30_DAYS">Últimos 30 dias</SelectItem>
          <SelectItem value="THIS_MONTH">Este mês</SelectItem>
          <SelectItem value="LAST_MONTH">Mês anterior</SelectItem>
          <SelectItem value="ALL">Todo o período</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
