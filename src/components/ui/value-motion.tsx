import type { AnimationEventHandler } from "react";
import { cn } from "@/lib/utils";
import styles from "./value-motion.module.css";

export function NumberPopIn({ from, to, onEnd }: {
  from: string;
  to: string;
  onEnd: AnimationEventHandler<HTMLSpanElement>;
}) {
  const before = [...from];
  const after = [...to];
  const offset = before.length - after.length;
  const lastChangedDigit = after.findLastIndex((character, index) =>
    character !== before[index + offset] && /\d/.test(character),
  );

  return (
    <span key={to} className={cn(styles["t-digit-group"], styles["is-animating"])} aria-hidden="true">
      {after.map((character, index) => {
        const old = before[index + offset];
        if (old === character || !/\d/.test(character)) {
          return <span key={index} className={styles["t-digit"]} data-same="">{character}</span>;
        }
        const fromEnd = after.length - 1 - index;
        return (
          <span key={index} className={styles["t-digit-slot"]} data-stagger={fromEnd === 1 ? 1 : fromEnd === 0 ? 2 : undefined}>
            {old && /\d/.test(old) && <span className={styles["t-digit-old"]}>{old}</span>}
            <span className={styles["t-digit"]} onAnimationEnd={index === lastChangedDigit ? onEnd : undefined}>
              {character}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export type OperationOutcome = "success" | "failure";

export function OperationMark({ animate, size = 48, onEnd, outcome }: {
  animate?: boolean;
  size?: number;
  onEnd?: () => void;
  outcome: OperationOutcome;
}) {
  return (
    <span
      aria-hidden="true"
      data-state={animate ? "in" : undefined}
      data-from-loading=""
      data-outcome={outcome}
      className={styles["t-success-check"]}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path
          d={outcome === "success" ? "M17.2803 24.9602L21.7603 29.7602L30.7203 20.1602" : "M19.25 19.25L28.75 28.75M28.75 19.25L19.25 28.75"}
          pathLength={outcome === "failure" ? 20 : undefined}
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          onAnimationEnd={onEnd}
        />
      </svg>
    </span>
  );
}
