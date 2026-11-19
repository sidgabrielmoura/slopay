"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PanelPrivacyToggle } from "@/components/layout/panel-privacy";
import { Button } from "@/components/ui/button";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { Input } from "@/components/ui/input";
import { ToastNotice } from "@/components/ui/toast-notice";
import { formatDateTime } from "@/lib/dates";
import { usePreferences } from "@/providers/preferences-provider";
import { adminPixCharges } from "../admin-pix-charges";

function PayableCode({ adminId, chargeId }: { adminId: string; chargeId: string }) {
  const codeInput = useId();
  const preview = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now);
  const [decoded, setDecoded] = useState<{ version: number; ready: boolean }>();
  const result = useQuery({
    queryKey: ["admin-charge-qr", adminId, chargeId],
    queryFn: ({ signal }) => adminPixCharges.qrCode(chargeId, signal),
    retry: false, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const expiresAt = result.data ? Date.parse(result.data.expiresAt) : null;
  const expired = expiresAt !== null && expiresAt <= Math.max(now, result.dataUpdatedAt);
  const code = expired || result.isError || result.isFetching ? undefined : result.data;
  const image = decoded?.version === result.dataUpdatedAt ? decoded : undefined;
  const error = result.isFetching ? null : expired ? "O QR Code desta cobrança expirou."
    : result.error?.message ?? (code && image?.ready === false ? "Não foi possível exibir a imagem." : null);
  const state = error ? "error" : code && image?.ready ? "ready" : "loading";

  useEffect(() => {
    if (expiresAt === null || expiresAt <= Math.max(now, result.dataUpdatedAt)) return;
    const remaining = Math.max(0, Math.min(expiresAt - Date.now(), 2_147_483_647));
    const timer = window.setTimeout(() => setNow(Date.now()), remaining);
    return () => window.clearTimeout(timer);
  }, [expiresAt, now, result.dataUpdatedAt]);

  async function copy() {
    if (!code || expiresAt === null) return;
    if (expiresAt <= Date.now()) {
      setNow(Date.now());
      return;
    }
    try {
      await navigator.clipboard.writeText(code.payload);
      toast.success("Pix Copia e Cola copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código para copiar manualmente.");
    }
  }

  return (
    <div ref={preview} tabIndex={-1} className="grid min-w-0 gap-3 outline-none sm:grid-cols-[11.5rem_minmax(0,1fr)] sm:items-center">
      <ToastNotice message={result.error?.message} />
      <ImageLoadingSurface className="mx-auto aspect-square w-full max-w-46 rounded-lg border border-border" state={state}
        fallback={<p className="text-pretty px-3 text-center text-sm text-muted-foreground">{error}</p>}>
        {code && (
          <div className="grid size-full place-items-center bg-white p-3">
            {/* Use the provider PNG directly and preserve the quiet zone. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={result.dataUpdatedAt} src={"data:image/png;base64," + code.encodedImage} width={160} height={160}
              alt="QR Code Pix da cobrança" className="size-full object-contain [image-rendering:pixelated]"
              onLoad={() => setDecoded({ version: result.dataUpdatedAt, ready: true })}
              onError={() => setDecoded({ version: result.dataUpdatedAt, ready: false })} />
          </div>
        )}
      </ImageLoadingSurface>
      <div className="grid min-w-0 justify-items-start gap-2">
        {state === "loading" && <p role="status" className="text-sm text-muted-foreground">Carregando QR Code…</p>}
        {state === "error" && (
          <Button type="button" variant="outline" className="h-11"
            onClick={() => { preview.current?.focus({ preventScroll: true }); setDecoded(undefined); void result.refetch(); }}>Consultar novamente</Button>
        )}
        {code && (
          <>
            <p className="text-pretty text-xs tabular-nums text-muted-foreground">QR Code válido até {formatDateTime(code.expiresAt, code.expirationDate.length === 10 ? "date-only" : "medium")}</p>
            <div className="grid w-full min-w-0 gap-1.5">
              <label htmlFor={codeInput} className="text-sm font-medium">Pix Copia e Cola</label>
              <Input id={codeInput} readOnly value={code.payload} onFocus={(event) => event.currentTarget.select()} className="h-11 min-w-0 font-mono text-xs" />
            </div>
            <Button type="button" variant="outline" className="h-11" onClick={() => void copy()}><Copy aria-hidden="true" /> Copiar código Pix</Button>
          </>
        )}
      </div>
    </div>
  );
}

function ChargeCodeDisclosure({ adminId, chargeId }: { adminId: string; chargeId: string }) {
  const content = useId();
  const [revealed, setRevealed] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" className="h-11 w-fit" aria-expanded={revealed} aria-controls={content}
        onClick={() => setRevealed(!revealed)}><QrCode aria-hidden="true" /> {revealed ? "Ocultar QR Code" : "Consultar QR Code"}</Button>
      <div id={content} hidden={!revealed}>
        {revealed && <PayableCode key={chargeId} adminId={adminId} chargeId={chargeId} />}
      </div>
    </>
  );
}

export function AdminChargePixCode({ adminId, chargeId }: { adminId: string; chargeId: string }) {
  const { preferencesReady, hideValues } = usePreferences();
  return (
    <section className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="text-balance text-sm font-semibold">Dados para pagamento</h3>
        <PanelPrivacyToggle className="text-muted-foreground" />
      </div>
      {preferencesReady && (hideValues ? <p className="text-pretty text-sm text-muted-foreground">Prévia Pix oculta pelo modo de privacidade.</p>
        : <ChargeCodeDisclosure adminId={adminId} chargeId={chargeId} />)}
    </section>
  );
}
