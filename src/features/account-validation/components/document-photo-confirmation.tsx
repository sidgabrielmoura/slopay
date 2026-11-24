"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OperationFailure } from "@/components/ui/loading-indicator";
import SlideCommit from "@/components/SlideCommit";
import { usePreferences } from "@/providers/preferences-provider";
import { OpeningDocumentImage } from "./opening-document-image";

export type DocumentPhoto = { file: File; preview: string };
export const acceptedDocumentImages = "image/jpeg,image/png";
const successHoldMs = 1500;

export function readDocumentPhoto(file: File): Promise<DocumentPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve({ file, preview: reader.result }) : reject(new Error("Não foi possível abrir a imagem."));
    reader.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
    reader.readAsDataURL(file);
  });
}

export function DocumentPhotoConfirmation({ photo, label, busy = false, onConfirm, onSent, onRetake }: {
  photo: DocumentPhoto; label: string; busy?: boolean;
  onConfirm: (file: File) => Promise<void>; onSent: () => void; onRetake: () => void;
}) {
  const { reduceMotion } = usePreferences();
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const submitting = useRef(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();

  useEffect(() => () => clearTimeout(timeout.current), []);

  async function confirm() {
    if (submitting.current) throw new Error("O envio já está em andamento.");
    submitting.current = true;
    setFailure(undefined);
    setSending(true);
    await onConfirm(photo.file);
  }

  return (
    <div className="grid gap-4">
      <OpeningDocumentImage src={photo.preview} alt={label} onReady={() => setPreviewReady(true)} />
      {failure && <OperationFailure message={failure} />}
      <div className="grid justify-items-center gap-2">
        <SlideCommit
          className="max-w-full" label="Deslize para enviar" doneLabel="Imagem enviada" errorLabel="Falha no envio"
          trackColor="#252C33" handleColor="#C6DD72" successColor="#35BA00" dangerColor="#E39A9A"
          holdMs={successHoldMs} reducedMotion={reduceMotion} disabled={!previewReady || busy} onConfirm={confirm} onDone={() => {
            const reduced = reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            timeout.current = setTimeout(onSent, reduced ? 0 : successHoldMs);
          }} onError={(reason) => {
            submitting.current = false;
            setSending(false);
            setFailure(reason instanceof Error ? reason.message : "Não foi possível enviar a imagem.");
          }}
        />
        <Button type="button" variant="ghost" className="min-h-11" disabled={sending || busy} onClick={onRetake}>
          Trocar foto
        </Button>
      </div>
    </div>
  );
}
