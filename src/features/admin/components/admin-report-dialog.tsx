"use client";

import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { formatDateTime } from "@/lib/dates";
import { adminReports, reportTitle, type ReportIssue, type ReportRecord } from "../admin-reports";
import { downloadCsvFile } from "./admin-csv-export";

export type ReportAction = { type: "issue"; report: ReportIssue } | { type: "download"; report: ReportRecord };

export function ReportFileDialog({ action, onClose, onRestoreFocus, onIssue }: {
  action: ReportAction; onClose: () => void; onRestoreFocus: () => void; onIssue: () => void;
}) {
  const issue = action.type === "issue";
  const title = reportTitle(action.report);
  const { fromDate, throughDate } = action.report;
  const period = `${formatDateTime(fromDate, "date-only")} a ${formatDateTime(throughDate, "date-only")}`;
  const file = useMutation({
    mutationFn: () => action.type === "issue" ? adminReports.issue(action.report) : adminReports.file(action.report.id),
    onSuccess: ({ report, csv }) => {
      downloadCsvFile(`slopay-${report.kind.toLowerCase()}-${report.fromDate}-${report.id.slice(0, 8)}.csv`, csv);
      if (issue) onIssue();
    },
  });

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open && !file.isPending) onClose(); }}>
      <AlertDialogContent className="max-w-[min(30rem,calc(100%-2rem))]"
        onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-balance">{file.isSuccess
            ? issue ? "Relatório emitido" : "CSV preparado"
            : issue ? "Emitir e baixar o relatório?" : "Baixar a versão emitida?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            {file.isSuccess
              ? issue ? "A versão emitida está disponível no histórico." : "O download da versão salva foi iniciado."
              : issue
                ? "A emissão registra uma versão com os dados disponíveis na confirmação. O CSV inclui os valores do recorte."
                : "O CSV inclui os dados da versão registrada no histórico."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {file.isSuccess && <div className="flex justify-center py-2" role="status" aria-label="Arquivo preparado"><LoadingConfirmation animate size={64} /></div>}
        <div className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="text-pretty text-sm font-medium">{title}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{period}</p>
          {action.report.search && <p className="wrap-anywhere text-xs text-muted-foreground">Empresa buscada · {action.report.search}</p>}
        </div>
        {file.isError && <OperationFailure message={file.error.message} />}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 h-11" disabled={file.isPending}>{file.isSuccess ? "Fechar" : "Cancelar"}</AlertDialogCancel>
          {!file.isSuccess && <Button type="button" className="h-11" disabled={file.isPending} onClick={() => file.mutate()}>
            {file.isPending ? <LoadingIndicator /> : <Download aria-hidden="true" />}
            {file.isPending ? "Preparando CSV…" : file.isError ? "Tentar novamente" : issue ? "Confirmar emissão" : "Baixar CSV"}
          </Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
