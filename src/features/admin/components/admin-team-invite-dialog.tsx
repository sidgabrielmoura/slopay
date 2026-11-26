"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { IntegrationConfirmationDialog } from "@/features/integrations/components/integration-confirmation-dialog";
import { ApiError } from "@/lib/api-client";
import { adminTeam, adminTeamInviteSchema } from "../admin-team";
import { adminAccessLevelLabels, type AdminAccessDraft } from "../admin-access";
import { AdminTeamAccessFields } from "./admin-team-access-fields";

type InviteReview = {
  result: Awaited<ReturnType<typeof adminTeam.inviteOptions>>;
  issuedAt: number;
  offeredForPasskey: boolean;
};

export function AdminTeamInviteDialog({ onClose, onInvited, restoreFocus }: {
  onClose: () => void; onInvited: () => void; restoreFocus: () => void;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<AdminAccessDraft>({ accessLevel: "VIEWER", grants: [] });
  const [failure, setFailure] = useState("");
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const reviewedEmail = useRef("");
  const currentReview = useRef<InviteReview>(null);
  const submitting = useRef(false);

  async function loadReview(address: string) {
    const result = await adminTeam.inviteOptions(address, access);
    const review = { result, issuedAt: Date.now(), offeredForPasskey: false };
    currentReview.current = review;
    return review;
  }

  function recentReview() {
    const review = currentReview.current;
    return review && Date.now() - review.issuedAt < 90_000 ? review : null;
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setFailure("");
    const form = event.currentTarget;
    const address = String(new FormData(form).get("email") ?? "").trim();
    const parsed = adminTeamInviteSchema.safeParse({ email: address, ...access });
    if (!parsed.success) {
      setInvalidEmail(true);
      setFailure("Confira o e-mail informado.");
      form.querySelector("input")?.focus();
      return;
    }
    submitting.current = true;
    setPreparing(true);
    try {
      await loadReview(parsed.data.email);
      reviewedEmail.current = parsed.data.email;
      setOpen(false);
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : "Não foi possível preparar o convite.");
      if (error instanceof ApiError && error.status === 409) {
        setInvalidEmail(true);
        form.querySelector("input")?.focus();
      }
    } finally {
      submitting.current = false;
      setPreparing(false);
    }
  }

  if (email) {
    return (
      <IntegrationConfirmationDialog
        scope={`admin-team-invite:${email}`}
        title="Confirmar convite de superadmin"
        description="Confirme sua identidade para convidar este endereço para a equipe administrativa."
        completed="Convite registrado"
        options={async () => {
          const current = recentReview();
          const review = current && !current.offeredForPasskey ? current : await loadReview(email);
          review.offeredForPasskey = true;
          return review.result;
        }}
        apply={async (proof) => {
          setFailure("");
          try {
            const review = "verificationCode" in proof ? recentReview() ?? await loadReview(email) : currentReview.current;
            if (!review) throw new Error("Prepare novamente a confirmação do convite.");
            return await adminTeam.invite(email, review.result.confirmation, proof, access);
          } catch (error) {
            if (error instanceof ApiError && !["INTEGRATION_CODE_REJECTED", "INTEGRATION_PASSKEY_REJECTED"].includes(error.code ?? "")) {
              setFailure(error.message);
            }
            throw error;
          }
        }}
        onSuccess={onInvited}
        onClose={onClose}
        restoreFocus={restoreFocus}
        resultContent={<p className="text-pretty text-sm text-muted-foreground">
          O e-mail entrou na fila de envio. O convite vale por 48 horas e já pode ser acompanhado na lista da equipe.
        </p>}>
        <div className="min-w-0 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">E-mail do novo superadmin</p>
          <p className="mt-1 wrap-anywhere text-sm font-semibold">{email}</p>
          <p className="mt-2 text-sm">{adminAccessLevelLabels[access.accessLevel]}{access.grants.length > 0 && ` · ${access.grants.length} permissões extras`}</p>
        </div>
        {failure && <OperationFailure message={failure} />}
      </IntegrationConfirmationDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting.current) setOpen(next); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (reviewedEmail.current) {
            setEmail(reviewedEmail.current);
            reviewedEmail.current = "";
          } else {
            restoreFocus();
            onClose();
          }
        }}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-balance">Criar membro</DialogTitle>
          <DialogDescription className="text-pretty">A pessoa receberá um convite para configurar o acesso de superadmin.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={review} aria-busy={preparing}>
          <div className="grid gap-2">
            <label htmlFor={fieldId} className="text-sm font-medium">E-mail</label>
            <Input id={fieldId} name="email" type="email" className="h-11" autoComplete="off" autoFocus
              maxLength={254} required readOnly={preparing} aria-invalid={invalidEmail || undefined}
              onChange={() => { setInvalidEmail(false); setFailure(""); }} />
          </div>
          <AdminTeamAccessFields draft={access} onChange={setAccess} disabled={preparing} />
          <ToastNotice message={failure} />
          <DialogFooter>
            <Button type="button" variant="ghost" className="h-11" disabled={preparing} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="h-11" disabled={preparing}>
              {preparing && <LoadingIndicator />}{preparing ? "Preparando…" : "Revisar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
