"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const count = new Intl.NumberFormat("pt-BR");

export function TablePagination({ page, pageSize, total, busy = false, onPageChange, label = "Paginação da tabela" }: {
  page: number;
  pageSize: number;
  total: number;
  busy?: boolean;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(total, page * pageSize);

  return (
    <nav aria-label={label} aria-busy={busy} className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <p className="text-xs tabular-nums text-muted-foreground">
        {count.format(first)}–{count.format(last)} de {count.format(total)}
      </p>
      <span role="status" className="sr-only">{busy ? "Carregando página…" : `Página ${page} de ${pages}`}</span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-11 gap-1 px-2"
          disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden="true" /> Anterior
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-11 gap-1 px-2"
          disabled={busy || page >= pages} onClick={() => onPageChange(page + 1)}>
          Próxima <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
