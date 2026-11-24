"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { maxOpeningDocumentBytes } from "../opening-documents";
import { acceptedDocumentImages, readDocumentPhoto, type DocumentPhoto } from "./document-photo-confirmation";

async function photoFromFrame(video: HTMLVideoElement, guide: HTMLElement) {
  const stage = video.getBoundingClientRect();
  const frame = guide.getBoundingClientRect();
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (Math.min(width, height) < 480 || !stage.width || !stage.height) {
    throw new Error("A imagem da câmera ainda não está nítida. Aguarde ou escolha uma foto do aparelho.");
  }

  // Translate the visible guide through the video's centered object-fit: cover.
  const scale = Math.max(stage.width / width, stage.height / height);
  const enlarge = Math.max(1, 480 / (Math.min(frame.width, frame.height) / scale));
  const cropWidth = Math.min(width, frame.width / scale * enlarge);
  const cropHeight = Math.min(height, frame.height / scale * enlarge);
  const centerX = width / 2 + (frame.left + frame.width / 2 - stage.left - stage.width / 2) / scale;
  const centerY = height / 2 + (frame.top + frame.height / 2 - stage.top - stage.height / 2) / scale;
  const x = Math.max(0, Math.min(width - cropWidth, centerX - cropWidth / 2));
  const y = Math.max(0, Math.min(height - cropHeight, centerY - cropHeight / 2));
  const size = Math.min(1, 2200 / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth * size);
  canvas.height = Math.round(cropHeight * size);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto.");
  context.drawImage(video, x, y, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.89));
  if (!photo || photo.size > maxOpeningDocumentBytes) throw new Error("Não foi possível preparar a foto neste tamanho.");
  return new File([photo], "documento.jpg", { type: "image/jpeg" });
}

export function DocumentCamera({ label, onPhoto }: { label: string; onPhoto: (photo: DocumentPhoto) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | undefined>(undefined);
  const generation = useRef(0);
  const [mode, setMode] = useState<"closed" | "opening" | "live">("closed");
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [error, setError] = useState<string>();

  const stop = useCallback(() => {
    generation.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(() => {
    function onHidden() {
      if (document.hidden) { stop(); setMode("closed"); setTakingPhoto(false); }
    }
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [stop]);

  async function openCamera() {
    if (mode !== "closed") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Abra o link em um navegador com acesso à câmera ou escolha uma foto do aparelho.");
      return;
    }
    const request = ++generation.current;
    setError(undefined);
    setMode("opening");
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (request !== generation.current || !video.current) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = camera;
      const preview = video.current;
      preview.srcObject = camera;
      await preview.play();
      if (request !== generation.current) return;
      camera.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (request !== generation.current) return;
        stop();
        setMode("closed");
        setError("A câmera foi interrompida. Abra a câmera novamente.");
      }, { once: true });
      setMode("live");
    } catch (reason) {
      if (request !== generation.current) return;
      stop();
      setMode("closed");
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Permita o acesso à câmera nas configurações do navegador ou escolha uma foto do aparelho."
        : "Não foi possível abrir a câmera. Tente novamente ou escolha uma foto do aparelho.");
    }
  }

  async function prepare(file?: File) {
    const request = generation.current;
    if (!file) return;
    try {
      if (!["image/jpeg", "image/png"].includes(file.type) || !file.size || file.size > maxOpeningDocumentBytes) {
        throw new Error("Escolha uma foto JPG ou PNG de até 3 MB.");
      }
      const result = await readDocumentPhoto(file);
      if (request === generation.current) { stop(); onPhoto(result); }
    } catch (reason) {
      if (request === generation.current) setError(reason instanceof Error ? reason.message : "Não foi possível preparar a foto.");
    }
  }

  async function takePicture() {
    if (!video.current || !guide.current || mode !== "live" || takingPhoto) return;
    const request = generation.current;
    setTakingPhoto(true);
    setError(undefined);
    try {
      const file = await photoFromFrame(video.current, guide.current);
      if (request === generation.current) await prepare(file);
    } catch (reason) {
      if (request === generation.current) setError(reason instanceof Error ? reason.message : "Não foi possível capturar a foto.");
    } finally {
      if (request === generation.current) setTakingPhoto(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="relative isolate grid h-[min(57dvh,32rem)] min-h-64 place-items-center overflow-hidden rounded-3xl bg-card">
        <video ref={video} autoPlay muted playsInline aria-label={"Prévia da câmera para " + label.toLowerCase()}
          className="absolute inset-0 size-full object-cover" />
        {mode === "opening" && <ImageLoadingSurface state="loading" className="absolute inset-0" />}
        <div ref={guide} aria-hidden="true"
          className="pointer-events-none relative aspect-[1.59] w-[86%] rounded-2xl border-2 border-primary/90 shadow-[0_0_0_100vmax_rgb(0_0_0_/_0.62)]" />
        <div className="pointer-events-none absolute inset-x-4 top-5 text-center">
          <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground">{label}</span>
        </div>
        {mode !== "live" && <p role="status" className="absolute inset-x-8 bottom-5 text-center text-pretty text-sm text-white/90">
          {mode === "opening" ? "Aguardando acesso à câmera…" : "Encaixe o documento na moldura."}
        </p>}
      </div>
      {error && <OperationFailure message={error} />}
      {mode === "live" ? (
        <Button type="button" className="min-h-12 w-full" disabled={takingPhoto} onClick={() => void takePicture()}>
          <Camera aria-hidden="true" />{takingPhoto ? "Preparando foto…" : "Tirar foto"}
        </Button>
      ) : (
        <Button type="button" className="min-h-12 w-full" disabled={mode === "opening"} onClick={() => void openCamera()}>
          <Camera aria-hidden="true" />Permitir câmera
        </Button>
      )}
      {mode !== "live" && <div className="grid justify-items-center">
        <input ref={picker} type="file" hidden aria-label="Escolher foto do aparelho" accept={acceptedDocumentImages}
          onChange={(event) => {
            void prepare(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }} />
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => picker.current?.click()}>
          <Images aria-hidden="true" />Escolher foto do aparelho
        </Button>
      </div>}
    </div>
  );
}
