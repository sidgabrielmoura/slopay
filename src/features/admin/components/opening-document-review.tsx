"use client";

import { useState, type FormEvent } from "react";
import { FileImage } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GlideSelect } from "@/components/ui/glide-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { Textarea } from "@/components/ui/textarea";
import { OpeningDocumentImage } from "@/features/account-validation/components/opening-document-image";
import {
  openingDocumentLabels, openingDocumentPath, openingDocumentsComplete,
  replacementReasonLabels, requestOpeningDocumentReplacement, verifyOpeningDocuments, type OpeningDocument, type ReplacementCategory,
} from "@/features/account-validation/opening-documents";

const replacementOptions = Object.entries(replacementReasonLabels).map(([value, label]) => ({ value, label }));

export function OpeningDocumentReview({ ownerId, version, documents, canReview, onChange }: {
  ownerId: string; version: number; documents: OpeningDocument[]; canReview: boolean; onChange: () => void;
}) {
  const [selection, setSelection] = useState<{ document: OpeningDocument; mode: "view" | "replace" }>();
  const [opened, setOpened] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [reviewFailure, setReviewFailure] = useState<string>();
  const [replacementFailure, setReplacementFailure] = useState<string>();
  const [category, setCategory] = useState<ReplacementCategory | "">("");
  const [reason, setReason] = useState("");
  const canRequest = category !== "" && (category !== "OTHER" || Boolean(reason.trim()));
  const [cpf, setCpf] = useState("");
  const cpfDigits = cpf.replace(/\D/g, "");
  const verified = openingDocumentsComplete(documents, true);
  const complete = openingDocumentsComplete(documents);
  const viewed = complete && documents.every((document) => opened.includes(document.id));
  const dialogTitle = selection?.mode === "replace" ? "Solicitar nova imagem" : "Documento de identidade";

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !viewed || !/^\d{11}$/.test(cpfDigits)) return;
    setReviewFailure(undefined);
    setBusy(true);
    try {
      await verifyOpeningDocuments(ownerId, version, cpfDigits);
      setCpf("");
      onChange();
    } catch (error) {
      setReviewFailure(error instanceof Error ? error.message : "Não foi possível registrar a conferência.");
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function replace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selection?.mode !== "replace" || !category || !canRequest || busy) return;
    setReplacementFailure(undefined);
    setBusy(true);
    try {
      await requestOpeningDocumentReplacement(ownerId, selection.document.id, version, category,
        category === "OTHER" ? reason.trim() : undefined);
      setSelection(undefined);
      setOpened([]);
      onChange();
      toast.success("Reenvio solicitado.");
    } catch (error) {
      setReplacementFailure(error instanceof Error ? error.message : "Não foi possível solicitar o reenvio.");
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-balance text-lg font-semibold">Documento de identidade</h2>
          {verified && <span className="inline-flex items-center gap-2 text-sm"><LoadingConfirmation size={22} animate />Verificado</span>}
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          {canReview
            ? "Confira a legibilidade, sinais de alteração e a correspondência com o cadastro."
            : "A visualização dos anexos é reservada ao responsável durante a análise."}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5">
        {documents.length ? <ul className="divide-y divide-border rounded-lg border border-border px-3">
          {documents.map((document) => {
            const label = openingDocumentLabels[document.side];
            return (
              <li key={document.id} className="flex flex-wrap items-center gap-2 py-3">
                <FileImage aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="mr-auto text-sm font-medium">{document.kind} · {label}</span>
                {document.replacementRequested ? <Badge variant="secondary">Reenvio solicitado</Badge> : canReview && (
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="outline" className="min-h-11" aria-label={"Visualizar " + label.toLowerCase()}
                      onClick={() => setSelection({ document, mode: "view" })}>Ver imagem</Button>
                    <Button type="button" variant="ghost" className="min-h-11" aria-label={"Pedir reenvio do " + label.toLowerCase()}
                      onClick={() => {
                        setCategory("");
                        setReason("");
                        setReplacementFailure(undefined);
                        setSelection({ document, mode: "replace" });
                      }}>Pedir reenvio</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul> : (
          <p className="text-pretty text-sm text-muted-foreground">O titular ainda precisa enviar o documento.</p>
        )}
        {canReview && complete && !verified && (
          <form className="grid gap-3" onSubmit={verify}>
            {viewed ? <div className="grid w-full max-w-xs gap-2">
              <label htmlFor="opening-document-cpf" className="text-sm font-medium">CPF que consta no documento</label>
              <BrazilianInput id="opening-document-cpf" mask="CPF" autoComplete="off" required
                value={cpf} disabled={busy} onChange={(event) => setCpf(event.currentTarget.value)} />
            </div> : (
              <p className="text-pretty text-sm text-muted-foreground">Abra a frente e o verso para registrar a conferência.</p>
            )}
            {reviewFailure && <OperationFailure message={reviewFailure} />}
            <Button type="submit" className="min-h-11 w-fit" disabled={!viewed || cpfDigits.length !== 11 || busy}>
              {busy && <LoadingIndicator />}Marcar como verificado
            </Button>
          </form>
        )}
      </CardContent>
      <Dialog open={canReview && Boolean(selection)} onOpenChange={(open) => { if (!open && !busy) setSelection(undefined); }}>
        <DialogContent className={selection?.mode === "view" ? "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl" : undefined}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {selection?.mode === "view"
                ? selection.document.kind + " · " + openingDocumentLabels[selection.document.side]
                : "Selecione o motivo que o titular verá ao reenviar a imagem."}
            </DialogDescription>
          </DialogHeader>
          {canReview && selection?.mode === "view" && (
            <OpeningDocumentImage key={selection.document.id} alt={openingDocumentLabels[selection.document.side] + " do documento de identidade"}
              src={openingDocumentPath(ownerId, selection.document.id)}
              onReady={() => setOpened((previous) => previous.includes(selection.document.id) ? previous : [...previous, selection.document.id])} />
          )}
          {canReview && selection?.mode === "replace" && (
            <form className="grid gap-4" onSubmit={replace}>
              <div className="grid gap-2">
                <label htmlFor="opening-document-category" className="text-sm font-medium">Motivo do reenvio</label>
                <GlideSelect id="opening-document-category" ariaLabel="Motivo do reenvio" size="lg"
                  options={replacementOptions} value={category} disabled={busy}
                  onChange={(value) => setCategory(value as ReplacementCategory)} />
              </div>
              {category === "OTHER" && <div className="grid gap-2">
                <label htmlFor="opening-document-instruction" className="text-sm font-medium">Orientação para o titular</label>
                <Textarea id="opening-document-instruction" value={reason} required maxLength={600} rows={3}
                  onChange={(event) => setReason(event.currentTarget.value)} disabled={busy} />
              </div>}
              {replacementFailure && <OperationFailure message={replacementFailure} />}
              <Button type="submit" className="min-h-11" disabled={!canRequest || busy}>
                {busy && <LoadingIndicator />}Solicitar reenvio
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
