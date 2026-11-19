import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./skeleton-reveal.module.css";

export function SkeletonReveal({
  revealed, pulsing = !revealed, flow, skeleton, children, className, layerClassName, onPulseEnd,
}: {
  revealed: boolean;
  pulsing?: boolean;
  flow?: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  layerClassName?: string;
  onPulseEnd?: () => void;
}) {
  return (
    <div
      className={cn(styles["t-skel"], revealed && styles["is-revealed"], flow && styles.flow, className)}
      aria-busy={!revealed}
      data-state={revealed ? "ready" : "loading"}
    >
      <div aria-hidden="true"
        className={cn(styles["t-skel-skeleton"], pulsing && styles["is-pulsing"], layerClassName)}
        onAnimationEnd={onPulseEnd}>
        {skeleton}
      </div>
      <div aria-hidden={!revealed} inert={!revealed} className={cn(styles["t-skel-content"], layerClassName)}>
        {children}
      </div>
    </div>
  );
}
