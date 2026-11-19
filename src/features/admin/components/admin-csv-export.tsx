"use client";

import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type CsvField = string | { cents: number };

function csvCell(value: CsvField) {
  if (typeof value !== "string") {
    const { cents } = value;
    const amount = Math.abs(cents);
    return `"${cents < 0 ? "-" : ""}${Math.floor(amount / 100)},${String(amount % 100).padStart(2, "0")}"`;
  }
  const formula = /^[\s\p{Cc}\p{Cf}]*[=+@\-＝＋＠－]|^[\t\r\n]/u.test(value);
  const safe = formula ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function downloadAdminCsv(filename: string, columns: string[], rows: CsvField[][]) {
  const csv = [columns, ...rows].map((record) => record.map(csvCell).join(";")).join("\r\n");
  downloadCsvFile(filename, csv);
}

export function downloadCsvFile(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function AdminCsvExport({ page, description, disabled, onExport, onRefresh }: {
  page: number;
  description: string;
  disabled: boolean;
  onExport: () => Promise<void>;
  onRefresh: () => void;
}) {
  const exportMutation = useMutation({
    mutationFn: onExport,
    onSuccess: () => toast.success("CSV da página gerado."),
    onError: (error) => {
      toast.error(error.message);
      onRefresh();
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-fit" disabled={disabled}
          aria-disabled={exportMutation.isPending || undefined} aria-busy={exportMutation.isPending}
          onClick={(event) => { if (exportMutation.isPending) event.preventDefault(); }}>
          <Download aria-hidden="true" /> {exportMutation.isPending ? "Preparando CSV…" : "Exportar CSV"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[min(28rem,calc(100%-2rem))]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-balance">Exportar página {page}?</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction className="h-11" onClick={() => exportMutation.mutate()}>Baixar CSV</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
