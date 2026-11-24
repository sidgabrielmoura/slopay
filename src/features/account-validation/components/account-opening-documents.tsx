"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, CloudUpload, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlideSelect } from "@/components/ui/glide-select";
import { LoadingConfirmation, OperationFailure } from "@/components/ui/loading-indicator";
import { AuthFormMotion } from "@/features/auth/components/auth-motion";
import { cn } from "@/lib/utils";
import {
  documentKinds, maxOpeningDocumentBytes, openingDocumentKind, openingDocumentLabels, openingDocumentSides, uploadOpeningDocument,
  type OpeningDocument, type OpeningDocumentKind, type OpeningDocumentSide,
} from "../opening-documents";
import { DocumentCaptureDialog } from "./document-capture-dialog";
import { acceptedDocumentImages, DocumentPhotoConfirmation, readDocumentPhoto, type DocumentPhoto } from "./document-photo-confirmation";

export function AccountOpeningDocuments({
  documents, representative, correctionReason, disabled, onSending, onUpload, onDocuments,
}: {
  documents: OpeningDocument[]; representative: boolean; correctionReason?: string | null; disabled: boolean;
  onSending: (sending: boolean) => void;
  onUpload: (document: OpeningDocument) => void;
  onDocuments: (documents: OpeningDocument[]) => void;
}) {
  const selectId = useId();
  const existing = documents.find((item) => !item.replacementRequested) ?? documents[0];
  const [selection, setSelection] = useState<OpeningDocumentKind>();
  const [side, setSide] = useState<OpeningDocumentSide>();
  const [lastSaved, setLastSaved] = useState<string>();
  const kind = existing?.kind ?? selection;
  const forSide = (which: OpeningDocumentSide) => documents.find((document) => document.side === which);
  const nextSide = openingDocumentSides.find((which) => which !== side &&
    (!forSide(which) || forSide(which)?.replacementRequested || forSide(which)?.kind !== kind));

  return (
    <AuthFormMotion step={side ? side === "FRONT" ? 1 : 2 : 0} animateOnMount={false}>
      {kind && side ? (
        <DocumentUpload key={kind + side} kind={kind} side={side} documents={documents}
          disabled={disabled} onSending={onSending} onDocuments={onDocuments}
          onBack={() => setSide(undefined)} onReceive={onUpload} onSent={(document) => {
            setLastSaved(document.id);
            setSide(nextSide);
          }} />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor={selectId} className="text-sm font-medium">Tipo de documento</label>
            <GlideSelect id={selectId} ariaLabel="Tipo de documento" size="lg" options={documentKinds}
              value={kind ?? ""} disabled={disabled || Boolean(existing)}
              onChange={(value) => setSelection(openingDocumentKind.parse(value))} />
            <p className="text-pretty text-sm text-muted-foreground">
              {representative ? "Use o documento do representante da empresa." : "Use um documento no seu nome."}
            </p>
          </div>
          {kind && <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {openingDocumentSides.map((which) => {
              const saved = forSide(which);
              const received = saved?.kind === kind && !saved.replacementRequested;
              const reason = saved?.replacementRequested ? saved.replacementReason ?? correctionReason : undefined;
              const label = <><span className="block text-sm font-medium">{openingDocumentLabels[which]} do documento</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {received ? "Recebido" : saved?.replacementRequested ? "Reenvio solicitado" : "Pendente"}
                </span>
                {reason && <span className="mt-1.5 block wrap-anywhere text-pretty text-sm text-destructive">{reason}</span>}</>;
              return (
                <li key={which}>
                  {received ? <div className="flex items-center gap-3 p-4">
                    <LoadingConfirmation size={32} animate={saved.id === lastSaved} />
                    <div className="min-w-0 flex-1">{label}</div>
                  </div> : <button type="button" disabled={disabled} onClick={() => setSide(which)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-60">
                    <LoadingConfirmation size={32} outcome="failure" />
                    <span className="min-w-0 flex-1">{label}</span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </button>}
                </li>
              );
            })}
          </ul>}
        </div>
      )}
    </AuthFormMotion>
  );
}

function DocumentUpload({ kind, side, documents, disabled, onBack, onSending, onReceive, onSent, onDocuments }: {
  kind: OpeningDocumentKind; side: OpeningDocumentSide; documents: OpeningDocument[]; disabled: boolean;
  onBack: () => void; onSending: (value: boolean) => void;
  onReceive: (document: OpeningDocument) => void; onSent: (document: OpeningDocument) => void;
  onDocuments: (documents: OpeningDocument[]) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const sent = useRef<OpeningDocument | undefined>(undefined);
  const selection = useRef(0);
  const [photo, setPhoto] = useState<DocumentPhoto>();
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [invalid, setInvalid] = useState<string>();
  const label = openingDocumentLabels[side];

  async function select(file?: File) {
    const id = ++selection.current;
    setInvalid(undefined);
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || !file.size || file.size > maxOpeningDocumentBytes) {
      setInvalid("Escolha uma imagem JPG ou PNG de até 3 MB.");
      return;
    }
    try {
      const result = await readDocumentPhoto(file);
      if (id === selection.current) setPhoto(result);
    } catch {
      if (id === selection.current) setInvalid("Não foi possível abrir a imagem.");
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled || sending) return;
    if (event.dataTransfer.files.length !== 1) {
      setInvalid("Adicione uma foto por vez.");
      return;
    }
    void select(event.dataTransfer.files[0]);
  }

  async function send(file: File) {
    setSending(true);
    onSending(true);
    try {
      const document = await uploadOpeningDocument(side, kind, file);
      sent.current = document;
      onReceive(document);
    } catch (error) {
      setSending(false);
      onSending(false);
      throw error;
    }
  }

  return (
    <section aria-labelledby="opening-document-upload-heading" className="grid min-w-0 gap-4">
      <Button type="button" variant="ghost" disabled={sending || disabled} className="min-h-11 w-fit px-2" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />Voltar aos documentos
      </Button>
      <div className="space-y-1">
        <h2 id="opening-document-upload-heading" className="text-balance text-xl font-semibold">{label} do {kind}</h2>
        <p className="text-pretty text-sm text-muted-foreground">Mostre todos os cantos e deixe o texto legível.</p>
      </div>
      {photo ? <DocumentPhotoConfirmation photo={photo} label={label + " do documento selecionado"} busy={disabled}
        onConfirm={send} onSent={() => {
          onSending(false);
          if (sent.current) onSent(sent.current);
        }}
        onRetake={() => { setPhoto(undefined); setInvalid(undefined); }} /> : (
        <div className={cn("grid justify-items-center gap-3 rounded-xl border border-dashed border-border bg-card p-5 text-center transition-colors",
          dragging && "border-primary bg-primary/10")} onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(!sending && !disabled); }
        }} onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }} onDrop={drop}>
          <CloudUpload aria-hidden="true" className="size-6 text-primary" />
          <div className="space-y-1">
            <p className="text-balance text-sm font-medium">Arraste a foto até aqui</p>
            <p className="text-sm text-muted-foreground">JPG ou PNG de até 3 MB</p>
          </div>
          <input ref={picker} type="file" aria-label={"Escolher foto do " + label.toLowerCase()} accept={acceptedDocumentImages}
            hidden onChange={(event) => {
              void select(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }} />
          <Button type="button" variant="outline" className="min-h-11" disabled={disabled || sending} onClick={() => picker.current?.click()}>
            <FileImage aria-hidden="true" />Selecionar arquivo
          </Button>
        </div>
      )}
      {invalid && <OperationFailure message={invalid} />}
      {!photo && <DocumentCaptureDialog side={side} kind={kind} documents={documents} disabled={disabled}
        onDocuments={onDocuments} onClose={(received) => { if (received) onBack(); }} />}
    </section>
  );
}
