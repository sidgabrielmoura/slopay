"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import { PanelAmount } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { Input } from "@/components/ui/input";
import { ToastNotice } from "@/components/ui/toast-notice";
import { LoadingConfirmation, OperationFailure } from "@/components/ui/loading-indicator";
import { ShareReceiptButton } from "@/features/receipts/share-receipt-button";
import { formatDateTime } from "@/lib/dates";
import type { PixReceipt, PixReceiptCode } from "../pix-receipt";
import { PixFlowTitle } from "./pix-operation-surface";
import { receiptStatusLabels } from "./pix-receipt-card";
import styles from "./dashboard-pix-receive.module.css";

function pixExpiration(value: string) {
  const normalized = value.length === 10 ? value + "T23:59:59.999" : value.replace(" ", "T");
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : normalized + "-03:00").getTime();
}

export function PixReceiptDetails({
  receipt, environment, inline, headingRef, code, qrError, qrFetching, onRetryQr, onSimulate, simulationRequested, onReconcile, reconciling, animateOutcome, onOutcomeEnd, onClose, onNew,
}: {
  receipt: PixReceipt;
  environment: "demo" | "sandbox" | "live";
  inline: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  code?: PixReceiptCode;
  qrError?: string;
  qrFetching: boolean;
  onRetryQr: () => void;
  onSimulate?: () => Promise<void>;
  simulationRequested: boolean;
  onReconcile?: () => void;
  reconciling?: boolean;
  animateOutcome: boolean;
  onOutcomeEnd: () => void;
  onClose?: () => void;
  onNew: () => void;
}) {
  const codeId = useId();
  const qrRegion = useRef<HTMLDivElement>(null);
  const [copiedPayload, setCopiedPayload] = useState<string>();
  const [busy, setBusy] = useState(false);
  const simulationLock = useRef(false);
  const [copyError, setCopyError] = useState("");
  const [simulationError, setSimulationError] = useState("");
  const [imageResult, setImageResult] = useState<{ encodedImage: string; state: "ready" | "error" }>();
  const [imageAttempt, setImageAttempt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const waiting = receipt.status === "preparing" || receipt.status === "pending";
  const paid = receipt.status === "paid";
  const refunded = receipt.status === "refunded" || receipt.status === "partially-refunded";
  const failed = receipt.status === "failed";
  const demo = environment === "demo";
  const expiresAt = code ? pixExpiration(code.expirationDate) : null;
  const codeExpired = expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= now);
  const usableCode = receipt.qrCodeAvailable && !codeExpired ? code : undefined;
  const decodedState = imageResult && imageResult.encodedImage === usableCode?.encodedImage ? imageResult.state : "loading";
  const qrState = qrFetching && decodedState !== "ready" ? "loading" : qrError || codeExpired ? "error" : decodedState;

  useEffect(() => {
    if (expiresAt === null || !Number.isFinite(expiresAt) || expiresAt <= now) return;
    const delay = Math.max(0, Math.min(expiresAt - Date.now(), 2_147_483_647));
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt, now]);

  async function copy() {
    if (!code) return;
    if (expiresAt !== null && expiresAt <= Date.now()) {
      setNow(Date.now());
      return;
    }
    setCopyError("");
    try {
      await navigator.clipboard.writeText(code.payload);
      setCopiedPayload(code.payload);
    } catch {
      setCopyError("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  async function simulate() {
    if (!onSimulate || simulationLock.current || simulationRequested) return;
    simulationLock.current = true;
    setBusy(true);
    setSimulationError("");
    try {
      await onSimulate();
    } catch (failure) {
      setSimulationError(failure instanceof Error ? failure.message : "Não foi possível solicitar a simulação.");
    } finally {
      simulationLock.current = false;
      setBusy(false);
    }
  }

  function retryQr() {
    qrRegion.current?.focus({ preventScroll: true });
    setImageResult(undefined);
    setImageAttempt((previous) => previous + 1);
    onRetryQr();
  }

  return (
    <div className="space-y-5">
      <PixFlowTitle inline={inline} ref={headingRef} tabIndex={-1} className="sr-only">{inline ? "Cobrança Pix" : "Receber Pix"}</PixFlowTitle>
      <div className="text-center">
        {(paid || refunded || failed) && (
          <div className="mb-4 flex justify-center">
            <LoadingConfirmation animate={animateOutcome} onEnd={onOutcomeEnd} outcome={failed ? "failure" : "success"} size={70} />
          </div>
        )}
        <p className="wrap-break-word text-3xl font-bold tracking-tight tabular-nums">
          <PanelAmount cents={receipt.amountInCents} />
        </p>
        <p role="status" className="mt-2 text-sm font-medium">
          {waiting && simulationRequested ? "Simulação solicitada. Aguardando confirmação." : receiptStatusLabels[receipt.status]}
        </p>
      </div>

      {waiting && (
        demo ? (
          <div className="space-y-3 rounded-lg border border-border bg-background p-4 text-center">
            <QrCode aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Simule a confirmação para testar o acompanhamento.</p>
            <Button type="button" variant="outline" disabled={busy} onClick={simulate} className="h-11 w-full">
              {busy ? "Simulando…" : "Simular pagamento"}
            </Button>
          </div>
        ) : (
          <div ref={qrRegion} tabIndex={-1} role="group" aria-label="QR Code da cobrança" className="space-y-3 outline-none">
            <ImageLoadingSurface
              className="mx-auto aspect-square w-full max-w-[216px] rounded-lg"
              state={qrState}
              fallback={codeExpired
                ? <p className="px-3 text-center text-sm text-white">O QR Code desta cobrança expirou.</p>
                : <OperationFailure className="mx-2" message={qrError ?? "Não foi possível carregar a imagem do QR Code."} />}
            >
              {usableCode && (
                <div className="grid size-full place-items-center bg-white p-3">
                  {/* Display the validated Asaas PNG directly, preserving the QR pixels. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={imageAttempt}
                    src={"data:image/png;base64," + usableCode.encodedImage}
                    width={192}
                    height={192}
                    alt="QR Code Pix da cobrança"
                    className={`${styles.qrImage} size-full object-contain`}
                    onLoad={() => setImageResult({ encodedImage: usableCode.encodedImage, state: "ready" })}
                    onError={() => setImageResult({ encodedImage: usableCode.encodedImage, state: "error" })}
                  />
                </div>
              )}
            </ImageLoadingSurface>
            {qrState === "loading" && (
              <p role="status" className="text-center text-sm text-muted-foreground">Buscando QR Code da cobrança…</p>
            )}
            {qrState === "error" && (
              <div className="text-center">
                <Button type="button" variant="outline" onClick={retryQr}>Consultar novamente</Button>
              </div>
            )}
            {usableCode && (
              <>
                <p className="text-center text-xs text-muted-foreground">
                  Validade do QR Code: {formatDateTime(expiresAt!, usableCode.expirationDate.length === 10 ? "date-only" : "medium")}
                </p>
                <div className="space-y-1.5">
                  <label htmlFor={codeId} className="text-sm font-medium">Pix Copia e Cola</label>
                  <div className="flex gap-2">
                    <Input id={codeId} className="h-11 min-w-0 font-mono text-xs" value={usableCode.payload} readOnly
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <Button type="button" variant="outline" className="h-11" onClick={copy}>
                      {copiedPayload === usableCode.payload ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      {copiedPayload === usableCode.payload ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      )}
      {!demo && waiting && onSimulate && (
        <Button type="button" variant="outline" disabled={busy || simulationRequested} aria-busy={busy} onClick={simulate} className="h-11 w-full">
          {busy ? "Solicitando simulação…" : "Simular pagamento"}
        </Button>
      )}
      {waiting && simulationError && <OperationFailure message={simulationError} />}
      <ToastNotice message={copyError} persistent />
      {paid && !demo && <ShareReceiptButton key={receipt.id} reference={receipt.id} />}
      <div className={onClose ? "grid gap-2 sm:grid-cols-2" : "grid"}>
        {onReconcile && <Button type="button" variant="outline" disabled={reconciling} onClick={onReconcile}>
          {reconciling ? "Agendando consulta…" : "Consultar cobrança"}
        </Button>}
        {onClose && (
          <Button type="button" variant="secondary" className="h-11" onClick={onClose}>
            {waiting ? "Acompanhar no painel" : "Fechar"}
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11" onClick={onNew}>Nova cobrança</Button>
      </div>
    </div>
  );
}
