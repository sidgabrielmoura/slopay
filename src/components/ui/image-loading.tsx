"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";
import styles from "./image-loading.module.css";

const opacityLevels = 16;

function createGrid(width: number, height: number) {
  const spacing = Math.max(8, Math.min(width, height) / 28, Math.max(width, height) / 48);
  const columns = Math.round(width / spacing);
  const rows = Math.round(height / spacing);
  const startX = (width - (columns - 1) * spacing) / 2;
  const startY = (height - (rows - 1) * spacing) / 2;
  const dots = Array.from({ length: columns * rows }, (_, index) => {
    const seed = Math.sin((index + 1) * 127.1) * 43_758.5453;
    const phase = (seed - Math.floor(seed)) * Math.PI * 2;
    const speed = 4.35 + (Math.cos(index * 1.73) + 1) * 0.5;
    return { x: startX + (index % columns) * spacing, y: startY + Math.floor(index / columns) * spacing, phase, speed };
  });
  return { dots, radius: Math.min(1.6, spacing * 0.145) };
}

function ImageLoadingDots({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { reduceMotion } = usePreferences();

  useEffect(() => {
    const element = canvas.current;
    if (!active || !element) return;
    const renderingContext = element.getContext("2d");
    if (!renderingContext) return;

    const node = element;
    const context = renderingContext;
    const dotColor = window.getComputedStyle(node).color;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver !== "function";
    let frame = 0;
    let lastPaint = -Infinity;
    let width = 0;
    let height = 0;
    let grid = createGrid(0, 0);
    const start = performance.now();

    function paint(time: number) {
      const paths = Array.from({ length: opacityLevels }, () => new Path2D());
      const { dots, radius } = grid;
      for (const { x, y, phase, speed } of dots) {
        const pulse = Math.max(0, (Math.cos(time * speed + phase) + 0.32) / 1.32);
        const level = Math.round((opacityLevels - 1) * pulse);
        if (level === 0) continue;
        paths[level].moveTo(x + radius, y);
        paths[level].arc(x, y, radius, 0, Math.PI * 2);
      }
      context.clearRect(0, 0, width, height);
      for (let index = 1; index < opacityLevels; index++) {
        context.globalAlpha = 0.72 * index / (opacityLevels - 1);
        context.fill(paths[index]);
      }
    }

    function syncPlayback() {
      if (width > 0 && height > 0 && visible && !document.hidden && !reduceMotion && !media.matches) {
        if (!frame) frame = window.requestAnimationFrame(tick);
      } else {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }

    function tick(now: number) {
      frame = 0;
      if (now - lastPaint >= 31) {
        lastPaint = now;
        paint((now - start) / 1000);
      }
      syncPlayback();
    }

    function resize(nextWidth: number, nextHeight: number) {
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      if (width > 0 && height > 0) {
        const scale = Math.min(window.devicePixelRatio || 1, 2, 760 / Math.max(width, height));
        node.width = Math.ceil(width * scale);
        node.height = Math.ceil(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.fillStyle = dotColor;
        grid = createGrid(width, height);
        paint(0);
        node.dataset.drawn = "";
      }
      syncPlayback();
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) resize(entry.contentRect.width, entry.contentRect.height);
    });
    const intersectionObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      syncPlayback();
    }) : undefined;
    resizeObserver.observe(node);
    intersectionObserver?.observe(node);
    document.addEventListener("visibilitychange", syncPlayback);
    media.addEventListener("change", syncPlayback);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      media.removeEventListener("change", syncPlayback);
    };
  }, [active, reduceMotion]);

  return <canvas ref={canvas} className={styles.dots} aria-hidden="true" />;
}

type ImageLoadingState = "loading" | "ready" | "error";

export function ImageLoadingSurface({ state, children, className, fallback }: {
  state: ImageLoadingState;
  children?: ReactNode;
  className?: string;
  fallback?: ReactNode;
}) {
  const ready = state === "ready";
  return (
    <div data-image-loading={state} aria-busy={state === "loading" || undefined}
      className={cn("relative isolate overflow-hidden", styles.frame, className)}>
      <ImageLoadingDots active={state === "loading"} />
      <div aria-hidden={!ready || undefined} inert={!ready} className={styles.content}>{children}</div>
      {state === "error" && fallback && <div className={styles.fallback}>{fallback}</div>}
    </div>
  );
}
