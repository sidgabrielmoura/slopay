"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { formatCNPJ } from "@/lib/validators";
import {
  accountOpenings, openingReviewSchema, type OpeningDetail, type OpeningReview,
} from "../account-openings";

const reviewCopy = {
  START_REVIEW: { title: "Assumir análise", description: "Seu nome ficará registrado como responsável pelo cadastro.", submit: "Assumir análise", complete: "Análise atribuída" },
  REQUEST_CHANGES: { title: "Solicitar ajustes", description: "A orientação ficará disponível para o titular no painel.", submit: "Solicitar ajustes", complete: "Ajustes solicitados" },
  REJECT: { title: "Recusar cadastro", description: "O motivo ficará disponível para o titular. A equipe poderá reabrir a análise.", submit: "Confirmar recusa", complete: "Recusa registrada" },
  REOPEN: { title: "Reabrir análise", description: "O cadastro voltará à fila. Você poderá assumir a análise na próxima etapa.", submit: "Reabrir análise", complete: "Análise reaberta" },
};

type DialogHandoff = { onClose: () => void; restoreFocus: () => void; onChange: () => void };
const compactDialog = "max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-lg";

export function OpeningReviewDialog({ application, action, onClose, restoreFocus, onChange }: DialogHandoff & {
  application: OpeningDetail["application"];
  action: OpeningReview["action"];
}) {
  const copy = reviewCopy[action];
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const version = useRef(application.version);
  const needsReason = action !== "START_REVIEW";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || outcome === "success") return;
    const data = new FormData(event.currentTarget);
    const input = openingReviewSchema.safeParse({ action, version: version.current, reason: needsReason ? data.get("reason") : undefined });
    if (!input.success) {
      toast.error("Informe o motivo da decisão em até 600 caracteres.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setOutcome(null);
    try {
      await accountOpenings.review(application.id, input.data);
      setOutcome("success");
      onChange();
    } catch (failure) {
      const message = failure instanceof ApiError ? failure.message : "Não foi possível registrar a decisão.";
      if (failure instanceof ApiError && failure.status === 409) onChange();
      setError(message);
      setOutcome("failure");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) setOpen(false); }}>
      <DialogContent className={compactDialog} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onClose(); restoreFocus(); }}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance">{outcome === "success" ? copy.complete : copy.title}</DialogTitle>
          <DialogDescription className="text-pretty">{outcome === "success" ? application.ownerName : copy.description}</DialogDescription>
        </DialogHeader>
        {outcome === "success" ? (
          <div className="grid justify-items-start gap-4">
            <LoadingConfirmation size={48} animate />
            <Button type="button" className="h-11" autoFocus onClick={() => setOpen(false)}>Concluir</Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={submit} aria-busy={busy}>
            {needsReason && (
              <Field id="opening-review-reason" label={action === "REQUEST_CHANGES" ? "Orientação para o titular" : "Motivo"}>
                <Textarea id="opening-review-reason" name="reason" required maxLength={600} readOnly={busy} />
              </Field>
            )}
            {outcome === "failure" && <OperationFailure message={error} />}
            <DialogFooter>
              <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant={action === "REJECT" ? "destructive" : "default"} className="h-11" disabled={busy}>
                {busy && <LoadingIndicator />}{busy ? "Registrando…" : copy.submit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OpeningApprovalDialog({ application, onClose, restoreFocus, onChange }: DialogHandoff & {
  application: OpeningDetail["application"];
}) {
  const [reviewed] = useState(application);
  const [failure, setFailure] = useState("");
  const personal = reviewed.accountType === "PF";
  const taxId = reviewed.submittedData?.cnpj;
  const name = personal ? reviewed.ownerName : reviewed.submittedData?.legalName ?? reviewed.legalName;

  return (
    <IntegrationConfirmationDialog scope={`account-opening:approve:${reviewed.id}:${reviewed.version}`}
      title="Confirmar aprovação" description="Confirme sua identidade para liberar o acesso do titular ao painel."
      completed="Cadastro aprovado" options={() => accountOpenings.approvalOptions(reviewed.id, reviewed.version)}
      apply={async (proof) => {
        setFailure("");
        try {
          return await accountOpenings.approve(reviewed.id, reviewed.version, proof);
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            setFailure(error.message);
            onChange();
          }
          throw error;
        }
      }}
      onSuccess={onChange} onClose={onClose} restoreFocus={restoreFocus}>
      <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{personal ? "Titular" : "Empresa"}</dt>
          <dd className="wrap-anywhere font-medium">{name}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{personal ? "CPF" : "CNPJ"}</dt>
          <dd className="tabular-nums">{personal ? `•••.•••.•••-${reviewed.cpfSuffix}` : taxId ? formatCNPJ(taxId) : "—"}</dd>
        </div>
      </dl>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="grid min-w-0 gap-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children}</div>;
}
