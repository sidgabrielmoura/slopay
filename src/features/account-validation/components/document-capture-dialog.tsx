"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { openingApplication } from "../account-opening-application";
import {
  mobileDocumentPath, openingDocumentSides, startOpeningCapture,
  type CapturePairing, type OpeningDocument, type OpeningDocumentKind, type OpeningDocumentSide,
} from "../opening-documents";

export function DocumentCaptureDialog({ kind, side, documents, disabled, onDocuments, onClose }: {
  kind: OpeningDocumentKind; side: OpeningDocumentSide; documents: OpeningDocument[];
  disabled: boolean; onDocuments: (documents: OpeningDocument[]) => void; onClose: (received: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const [pairing, setPairing] = useState<CapturePairing>();
  const [error, setError] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [expected, setExpected] = useState<readonly OpeningDocumentSide[]>([side]);
  const requestId = useRef(0);
  const received = (which: OpeningDocumentSide) =>
    documents.some((doc) => doc.side === which && doc.kind === kind && !doc.replacementRequested);
  const complete = expected.every(received);

  async function generate() {
    const id = ++requestId.current;
    setPairing(undefined);
    setError(undefined);
    setExpired(false);
    const pending = openingDocumentSides.filter((which) => !received(which));
    setExpected(pending);
    const nextSide = pending.includes(side) ? side : pending[0];
    if (!nextSide) return;
    try {
      const result = await startOpeningCapture(kind, nextSide);
      if (id === requestId.current) setPairing(result);
    } catch (reason) {
      if (id === requestId.current) setError(reason instanceof Error ? reason.message : "Não foi possível gerar o QR Code.");
    }
  }

  async function openCamera() {
    if (openingCamera) return;
    setOpeningCamera(true);
    setCameraError(undefined);
    try {
      const result = await startOpeningCapture(kind, side);
      window.location.assign(mobileDocumentPath + "?origem=cadastro#" + result.pairing);
    } catch (reason) {
      setCameraError(reason instanceof Error ? reason.message : "Não foi possível preparar a câmera.");
    } finally {
      setOpeningCamera(false);
    }
  }

  useEffect(() => {
    if (!open || !pairing || complete || expired) return;
    const controller = new AbortController();
    let interval: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const result = await openingApplication.get(controller.signal);
        if (!controller.signal.aborted && result.documents) onDocuments(result.documents);
      } catch {
        // The owner can close the QR Code and reopen the document step to resume.
      } finally {
        if (!controller.signal.aborted) interval = setTimeout(refresh, 3500);
      }
    }
    const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(pairing.expiresAt) - Date.now()));
    interval = setTimeout(refresh, 1800);
    return () => {
      clearTimeout(interval);
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, pairing, complete, expired, onDocuments]);

  const failed = error || expired;
  const qrState = failed ? "error" : pairing ? "ready" : "loading";
  const url = pairing && window.location.origin + mobileDocumentPath + "#" + pairing.pairing;

  return (
    <>
      <div className="hidden gap-2 [@media(pointer:coarse)]:grid">
        <Button type="button" disabled={disabled || openingCamera} className="min-h-11" onClick={() => void openCamera()}>
          {openingCamera ? <LoadingIndicator /> : <Camera aria-hidden="true" />}
          {openingCamera ? "Preparando câmera…" : "Usar câmera"}
        </Button>
        {cameraError && <OperationFailure message={cameraError} />}
      </div>
      <Dialog open={open} onOpenChange={(next) => {
        setOpen(next);
        if (next) void generate();
        else { requestId.current++; onClose(received(side)); }
      }}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="min-h-11 w-full [@media(pointer:coarse)]:hidden">
            <Smartphone aria-hidden="true" />Fazer no celular
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar pelo celular</DialogTitle>
            <DialogDescription>
              {complete ? "As imagens enviadas no celular já estão no cadastro."
                : "Abra a câmera do celular e escaneie o QR Code. O acesso fica disponível por até 10 minutos."}
            </DialogDescription>
          </DialogHeader>
          {complete ? (
            <div role="status" className="grid justify-items-center gap-3 py-4">
              <LoadingConfirmation size={52} animate />
              <span className="text-sm font-medium">Envio recebido</span>
            </div>
          ) : (
            <>
              <ImageLoadingSurface className="mx-auto aspect-square w-full max-w-60 rounded-xl"
                state={qrState} fallback={<Smartphone aria-hidden="true" className="text-muted-foreground" />}>
                {url && <div className="grid size-full place-items-center bg-white p-2.5">
                  <QRCodeSVG value={url} title="QR Code para fotografar o documento no celular" size={220}
                    className="size-full" marginSize={4} level="M" />
                </div>}
              </ImageLoadingSurface>
              {failed
                ? <OperationFailure message={error || "O QR Code expirou. Gere outro para continuar."} />
                : <p role="status" className="text-center text-sm text-muted-foreground">
                  {!pairing ? "Preparando QR Code…" : expected.filter(received).map((which) =>
                    which === "FRONT" ? "Frente recebida" : "Verso recebido").join(" · ") || "Aguardando as imagens"}
                </p>}
            </>
          )}
          {failed && !complete ? (
            <Button type="button" className="min-h-11" onClick={() => void generate()}>
              Gerar novo QR Code
            </Button>
          ) : (
            <Button type="button" variant={complete ? "default" : "outline"} className="min-h-11" onClick={() => {
              setOpen(false);
              requestId.current++;
              onClose(received(side));
            }}>{complete ? "Voltar aos documentos" : "Fechar"}</Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
