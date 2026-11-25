"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandImage } from "@/components/shared/brand-image";
import { Button } from "@/components/ui/button";
import { LoadingConfirmation, LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { AuthFormMotion, AuthMotionSurface } from "@/features/auth/components/auth-motion";
import { ApiError } from "@/lib/api-client";
import { accountOpeningPath } from "@/lib/auth-navigation";
import {
  captureIdSchema, captureTokenSchema, claimOpeningCapture, openingDocumentLabels, readOpeningCapture, sendCapturePhoto,
  type CaptureSession, type OpeningDocumentSide,
} from "../opening-documents";
import { DocumentCamera } from "./document-camera";
import { DocumentPhotoConfirmation, type DocumentPhoto } from "./document-photo-confirmation";

const newQrMessage = "Gere um novo QR Code na abertura de conta do computador e escaneie novamente.";
const captureStorageKey = "slopay:opening-document-capture";

function savedCaptureId() {
  try { return captureIdSchema.safeParse(window.sessionStorage.getItem(captureStorageKey)).data; }
  catch { return undefined; }
}

function saveCaptureId(id?: string) {
  try {
    if (id) window.sessionStorage.setItem(captureStorageKey, id);
    else window.sessionStorage.removeItem(captureStorageKey);
  } catch {
    // The current tab can still finish the capture with the ID held in memory.
  }
}

export function MobileDocumentCapture({ returnToApplication }: { returnToApplication: boolean }) {
  const attempt = useRef<Promise<CaptureSession> | undefined>(undefined);
  const unclaimedCode = useRef<string | undefined>(undefined);
  const [progress, setProgress] = useState<CaptureSession>();
  const [error, setError] = useState<{ message: string; retry: boolean }>();
  const [retry, setRetry] = useState(0);
  const expiredMessage = returnToApplication ? "Volte ao cadastro e abra a câmera novamente." : newQrMessage;

  useEffect(() => {
    function rescan() {
      if (!window.location.hash) return;
      attempt.current = undefined;
      setProgress(undefined);
      setError(undefined);
      setRetry((value) => value + 1);
    }
    window.addEventListener("hashchange", rescan);
    return () => window.removeEventListener("hashchange", rescan);
  }, []);

  useEffect(() => {
    if (!attempt.current) {
      const fragment = window.location.hash;
      if (fragment) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        saveCaptureId();
        unclaimedCode.current = captureTokenSchema.safeParse(fragment.slice(1)).data;
      }
      const code = unclaimedCode.current;
      const id = savedCaptureId();
      if (code) attempt.current = claimOpeningCapture(code);
      else if (id) attempt.current = readOpeningCapture(id);
      else attempt.current = Promise.reject(new ApiError(expiredMessage, 401));
    }
    const request = attempt.current;
    let active = true;
    void request.then(
      (result) => {
        if (!active || request !== attempt.current) return;
        unclaimedCode.current = undefined;
        saveCaptureId(result.id);
        setProgress(result);
      },
      (reason: unknown) => {
        if (!active || request !== attempt.current) return;
        if (reason instanceof ApiError && reason.status === 401) {
          unclaimedCode.current = undefined;
          saveCaptureId();
          setError({ message: expiredMessage, retry: false });
        } else setError({ message: "Não foi possível conectar o celular. Tente novamente.", retry: true });
      },
    );
    return () => { active = false; };
  }, [retry, expiredMessage]);

  useEffect(() => {
    if (!progress?.pending.length) return;
    const timer = setTimeout(() => {
      saveCaptureId();
      setError({ message: expiredMessage, retry: false });
    }, Math.max(0, Date.parse(progress.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [progress, expiredMessage]);

  const side = progress?.pending[0];
  const label = side && openingDocumentLabels[side] + " do " + progress.kind;

  return (
    <AuthMotionSurface className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-md gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <BrandImage />
          {returnToApplication && (!progress || side || error) && <Button asChild variant="ghost" className="min-h-11 px-2">
            <Link href={accountOpeningPath} prefetch={false}><ArrowLeft aria-hidden="true" />Voltar ao cadastro</Link>
          </Button>}
        </header>
        {error ? (
          <section className="grid gap-4">
            <h1 className="text-balance text-2xl font-semibold">Envio de documentos</h1>
            <OperationFailure message={error.message} />
            {error.retry && <Button type="button" className="min-h-11" onClick={() => {
              attempt.current = undefined;
              setError(undefined);
              setRetry((value) => value + 1);
            }}>Tentar novamente</Button>}
          </section>
        ) : !progress ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingIndicator />Conectando o celular…
          </p>
        ) : (
          <AuthFormMotion step={2 - progress.pending.length} animateOnMount={false}>
            {side && label ? (
              <CaptureSide key={side} captureId={progress.id} side={side} label={label} onSent={() => {
                setProgress((previous) => previous && { ...previous, pending: previous.pending.filter((item) => item !== side) });
              }} onExpired={() => { saveCaptureId(); setError({ message: expiredMessage, retry: false }); }} />
            ) : (
              <section className="grid justify-items-center gap-3 rounded-2xl border border-border bg-card px-5 py-10 text-center">
                <LoadingConfirmation animate size={56} />
                <h1 className="text-balance text-2xl font-semibold">Imagens enviadas</h1>
                <p className="text-pretty text-sm text-muted-foreground">
                  {returnToApplication ? "Revise o cadastro e envie a solicitação."
                    : "Volte ao computador para revisar o cadastro e enviar a solicitação."}
                </p>
                {returnToApplication && <Button asChild className="min-h-11">
                  <Link href={accountOpeningPath} prefetch={false}>Voltar ao cadastro</Link>
                </Button>}
              </section>
            )}
          </AuthFormMotion>
        )}
      </div>
    </AuthMotionSurface>
  );
}

function CaptureSide({ captureId, side, label, onSent, onExpired }: {
  captureId: string; side: OpeningDocumentSide; label: string; onSent: () => void; onExpired: () => void;
}) {
  const [photo, setPhoto] = useState<DocumentPhoto>();

  return (
    <section className="grid gap-4">
      <div className="space-y-1.5">
        <h1 className="text-balance text-2xl font-semibold">{label}</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          {photo ? "Confira se todos os dados estão legíveis antes de enviar."
            : "Deixe todos os cantos dentro da moldura, com boa luz e sem reflexos."}
        </p>
      </div>
      {photo ? <DocumentPhotoConfirmation photo={photo} label={label} onRetake={() => setPhoto(undefined)}
        onConfirm={async (file) => {
          try {
            await sendCapturePhoto(captureId, side, file);
          } catch (reason) {
            if (reason instanceof ApiError && reason.status === 401) { onExpired(); throw reason; }
            if (reason instanceof ApiError && (reason.status === 409 || reason.status === 503)) {
              const current = await readOpeningCapture(captureId).catch(() => undefined);
              if (current && !current.pending.includes(side)) return;
            }
            throw reason;
          }
        }}
        onSent={onSent} /> : <DocumentCamera label={label} onPhoto={setPhoto} />}
    </section>
  );
}
