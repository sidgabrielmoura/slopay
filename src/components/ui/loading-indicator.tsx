"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { OperationMark, type OperationOutcome } from "./value-motion";
import styles from "./loading-indicator.module.css";

export function LoadingIndicator({ size = 16, active = true, className }: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const indicator = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = indicator.current;
    if (!node || !active || typeof IntersectionObserver !== "function") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) node.toggleAttribute("data-offscreen", !entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return (
    <span ref={indicator} aria-hidden="true" data-loading-indicator data-active={active}
      className={cn(styles.indicator, className)} style={{ width: size, height: size }}>
      <span className={styles.ring}>
        <span className={styles.sweep} />
      </span>
    </span>
  );
}

export function LoadingConfirmation({ size = 48, animate = false, onEnd, outcome = "success" }: {
  size?: number;
  animate?: boolean;
  onEnd?: () => void;
  outcome?: OperationOutcome;
}) {
  return (
    <span aria-hidden="true" className={styles.confirmation} data-loading-confirmation={outcome}>
      {animate && (
        <span className={styles.outgoing}>
          <LoadingIndicator size={size} />
        </span>
      )}
      <OperationMark size={size} animate={animate} outcome={outcome} onEnd={onEnd} />
    </span>
  );
}

export function OperationFailure({ message, className, animate = true }: {
  message: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div role="alert" className={cn("flex min-w-0 items-center gap-3 rounded-lg border border-destructive/30! bg-card p-3 text-left", className)}>
      <LoadingConfirmation size={32} animate={animate} outcome="failure" />
      <p className="min-w-0 wrap-anywhere text-pretty text-sm">{message}</p>
    </div>
  );
}
