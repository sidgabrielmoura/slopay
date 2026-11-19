"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { requestPixGateway } from "@/lib/pix-gateway-client";
import { usePreferences } from "@/providers/preferences-provider";
import { statementExportRequest, statementExportResult } from "../live-transactions";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo",
});
const exportUnavailable = "Não foi possível exportar o extrato.";

function dateInputValue(date: number) {
  const fields = Object.fromEntries(dateFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function StatementExportDialog({ direction, status, search, disabled }: {
  direction?: "IN" | "OUT"; status?: string; search: string; disabled: boolean;
}) {
  const { hideValues, preferencesReady } = usePreferences();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (hideValues || !preferencesReady) {
      toast.error("Desative o modo de privacidade para exportar valores.");
      return;
    }
    const dates = new FormData(event.currentTarget);
    const request = statementExportRequest.safeParse({
      direction, status, search, fromDate: dates.get("fromDate"), throughDate: dates.get("throughDate"),
    });
    if (!request.success) {
      toast.error("Selecione um período de até 366 dias.");
      return;
    }

    setBusy(true);
    try {
      const { csv, rowCount } = await requestPixGateway("/api/dashboard/transactions/export",
        statementExportResult, exportUnavailable, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.data),
        });
      if (!rowCount) {
        toast.info("Nenhuma movimentação corresponde aos filtros e ao período.");
        return;
      }
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.download = "extrato-pix-" + request.data.fromDate + "_" + request.data.throughDate + ".csv";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Extrato gerado em CSV.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : exportUnavailable);
    } finally {
      setBusy(false);
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size="sm" disabled={disabled || !preferencesReady} className="gap-1.5">
        <Download className="size-3.5" aria-hidden="true" /> Exportar CSV
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle className="text-balance">Exportar extrato</DialogTitle>
        <DialogDescription className="text-pretty">O arquivo inclui as movimentações do período que correspondem aos filtros do extrato.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium">
            Data inicial
            <Input className="h-11" type="date" name="fromDate" defaultValue={dateInputValue(Date.now() - 29 * 86_400_000)}
              max={dateInputValue(Date.now())} disabled={busy} required />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium">
            Data final
            <Input className="h-11" type="date" name="throughDate" defaultValue={dateInputValue(Date.now())}
              max={dateInputValue(Date.now())} disabled={busy} required />
          </label>
        </div>
        <Button type="submit" className="h-11 sm:justify-self-end" disabled={busy}>
          {busy ? <LoadingIndicator /> : <Download aria-hidden="true" />} {busy ? "Gerando arquivo…" : "Baixar CSV"}
        </Button>
      </form>
    </DialogContent>
  </Dialog>;
}
