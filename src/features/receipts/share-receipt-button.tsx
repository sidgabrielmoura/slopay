"use client";

import { useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingIndicator, OperationFailure } from "@/components/ui/loading-indicator";
import { usePreferences } from "@/providers/preferences-provider";
import { createReceiptLink, receiptUnavailable, sharedReceiptPath } from "./pix-receipt-share";
import { cn } from "@/lib/utils";

type ReceiptLink = { url: string; expiresAt: string };

async function copyLink(link: Promise<string>) {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem === "function") {
      // Queue the clipboard write while the click still grants permission.
      const text = link.then((url) => new Blob([url], { type: "text/plain" }));
      void text.catch(() => undefined);
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
    } else {
      await navigator.clipboard.writeText(await link);
    }
    return true;
  } catch {
    return false;
  }
}

export function ShareReceiptButton({ reference, className, showText = true }: { reference: string, className?: string, showText?: boolean }) {
  const { hideValues, preferencesReady } = usePreferences();
  const lock = useRef(false);
  const [link, setLink] = useState<ReceiptLink>();
  const [status, setStatus] = useState<"idle" | "loading" | "copied" | "manual">("idle");
  const [error, setError] = useState("");

  async function share() {
    if (lock.current || !preferencesReady) return;
    if (hideValues) {
      toast.info("Desative o modo de privacidade para compartilhar o comprovante.");
      return;
    }
    lock.current = true;
    setError("");
    setStatus("loading");

    const request = link && Date.parse(link.expiresAt) > Date.now()
      ? Promise.resolve(link)
      : createReceiptLink(reference).then(({ shareToken, expiresAt }) => ({
        url: new URL(sharedReceiptPath + "#" + shareToken, window.location.origin).href,
        expiresAt,
      }));
    try {
      const [result, copied] = await Promise.all([request, copyLink(request.then(({ url }) => url))]);
      setLink(result);
      setStatus(copied ? "copied" : "manual");
      if (copied) toast.success("Link do comprovante copiado.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : receiptUnavailable);
      setStatus("idle");
    } finally {
      lock.current = false;
    }
  }

  return (
    <div className="grid min-w-0 gap-2">
      <Button type="button" variant="outline" className={cn(className, "h-11 w-full! max-w-full justify-self-start")}
        disabled={status === "loading" || !preferencesReady} aria-busy={status === "loading"}
        aria-label={status === "loading" ? "Preparando link…" : status === "copied" && !hideValues ? "Link copiado" : "Compartilhar comprovante"}
        onClick={() => void share()}>
        {status === "loading" ? <LoadingIndicator />
          : status === "copied" && !hideValues ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        {status === "loading" ? "Preparando link…" : status === "copied" && !hideValues ? "Link copiado" : showText && "Compartilhar"}
      </Button>
      {status === "manual" && link && !hideValues && showText && (
        <div className="grid gap-1.5">
          <p className="text-sm text-muted-foreground" role="status">Copie o link abaixo.</p>
          <Input aria-label="Link do comprovante" value={link.url} readOnly
            className="h-11 w-full min-w-0" onFocus={(event) => event.currentTarget.select()} />
        </div>
      )}
      {error && <OperationFailure message={error} />}
    </div>
  );
}
