"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { cn } from "@/lib/utils";

export function OpeningDocumentImage({ src, alt, compact, onReady }: {
  src: string; alt: string; compact?: boolean; onReady?: () => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <ImageLoadingSurface state={state}
      className={cn("w-full overflow-hidden rounded-lg border border-border bg-background", compact ? "h-36" : "h-[min(53dvh,30rem)]")}
      fallback={<span role="status" className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <ImageOff size={16} aria-hidden="true" />Não foi possível abrir a imagem.
      </span>}>
      {/* Document images are private and must bypass the image optimization cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="size-full object-contain" referrerPolicy="no-referrer"
        onLoad={() => { setState("ready"); onReady?.(); }} onError={() => setState("error")} />
    </ImageLoadingSurface>
  );
}
