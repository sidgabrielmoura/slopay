"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { Textarea } from "@/components/ui/textarea";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { adminCompanies, companyChangeSchema, type CompanyChange, type CompanyDetail } from "../admin-companies";
import { CompanyField } from "./company-display";

const titles = {
  EDIT_PROFILE: { review: "Confirmar atualização cadastral", completed: "Cadastro atualizado" },
  SUSPEND: { review: "Confirmar suspensão do acesso", completed: "Acesso suspenso" },
  REACTIVATE: { review: "Confirmar reativação do acesso", completed: "Acesso reativado" },
};

export function AdminReasonField({ label = "Motivo da alteração", readOnly = false }: { label?: string; readOnly?: boolean } = {}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <Textarea id={id} name="reason" required maxLength={600} rows={3} readOnly={readOnly} />
    </div>
  );
}

type CompanyConfirmationTarget = Pick<CompanyDetail, "id" | "tradeName" | "legalName">;
export type CompanyAccessTarget = CompanyConfirmationTarget & Pick<CompanyDetail, "profileVersion"> & {
  owner: Pick<CompanyDetail["owner"], "fullName" | "status">;
};

export function CompanyChangeConfirmation({ company, change, reviewed = [], onChange, onClose, onSuccess, restoreFocus }: {
  company: CompanyConfirmationTarget; change: CompanyChange; reviewed?: ReadonlyArray<readonly [string, string]>;
  onChange: () => void; onClose: () => void; onSuccess?: () => void; restoreFocus: () => void;
}) {
  const [failure, setFailure] = useState("");
  const copy = titles[change.action];
  return (
    <IntegrationConfirmationDialog
      scope={`company:${company.id}:${change.action}:${change.version}`}
      title={copy.review} description={company.tradeName ?? company.legalName} completed={copy.completed}
      options={() => adminCompanies.options(company.id, change)}
      apply={async (proof) => {
        setFailure("");
        try {
          return await adminCompanies.change(company.id, change, proof);
        } catch (error) {
          if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
            setFailure(error.message);
            if (error.status === 409) onChange();
          }
          throw error;
        }
      }}
      onSuccess={() => { onChange(); onSuccess?.(); }}
      onClose={onClose} restoreFocus={restoreFocus}>
      <dl className="grid min-w-0 gap-3 rounded-lg border border-border bg-muted/40 p-4">
        {reviewed.map(([label, value]) => <CompanyField key={label} label={label}>{value}</CompanyField>)}
        <CompanyField label="Motivo"><span className="whitespace-pre-wrap">{change.reason}</span></CompanyField>
      </dl>
      {failure && <OperationFailure message={failure} />}
    </IntegrationConfirmationDialog>
  );
}

export function CompanyAccessDialog({ company, onChange, onClose, restoreFocus }: {
  company: CompanyAccessTarget; onChange: () => void; onClose: () => void; restoreFocus: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<CompanyChange>();
  const prepared = useRef<CompanyChange>(null);
  const initial = useRef({ version: company.profileVersion, status: company.owner.status });
  const suspending = initial.current.status === "ACTIVE";
  const action = suspending ? "SUSPEND" : "REACTIVATE";
  const title = suspending ? "Suspender acesso" : "Reativar acesso";

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = companyChangeSchema.safeParse({
      action, version: initial.current.version, reason: new FormData(event.currentTarget).get("reason"),
    });
    if (!input.success) { toast.error("Informe o motivo da alteração em até 600 caracteres."); return; }
    prepared.current = input.data;
    setOpen(false);
  }

  if (draft) {
    return <CompanyChangeConfirmation company={company} change={draft}
      reviewed={[["Titular", company.owner.fullName], ["Acesso ao Slopay", suspending ? "Suspenso" : "Ativo"]]}
      onChange={onChange} onClose={onClose} restoreFocus={restoreFocus} />;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (prepared.current) {
            setDraft(prepared.current);
            prepared.current = null;
          } else {
            onClose();
            restoreFocus();
          }
        }}>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-balance">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            {suspending
              ? "As sessões do titular serão encerradas, e o login e as chaves de API serão bloqueados no Slopay. Operações já enviadas ao Asaas podem ser concluídas."
              : "O titular poderá entrar novamente, e as chaves válidas voltarão a ser aceitas no Slopay."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="grid gap-4" onSubmit={review}>
          <AdminReasonField />
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-11">Cancelar</AlertDialogCancel>
            <Button type="submit" className="h-11" variant={suspending ? "destructive" : "default"}>Revisar alteração</Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
