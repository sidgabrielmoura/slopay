"use client";

import { useState, useSyncExternalStore } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { usePreferences } from "@/providers/preferences-provider";
import styles from "./header-motion.module.css";

const revealedProfiles = new Set<string>();
const motionQuery = "(prefers-reduced-motion: reduce)";
const noSubscription = () => () => undefined;
const serverSnapshot = () => false;

function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function NotificationBadge({ count }: { count: number }) {
  const [lastCount, setLastCount] = useState(count);
  if (count > 0 && count !== lastCount) setLastCount(count);
  const label = count || lastCount;

  return (
    <span aria-hidden="true" className={styles["t-badge"]} data-open={count > 0}>
      <span className={cn(
        styles["t-badge-dot"],
        "min-w-4.5 rounded-full bg-primary px-1.5 py-0.5 text-center text-xs font-semibold text-primary-foreground tabular-nums ring-2 ring-card",
      )}>
        {label > 99 ? "99+" : label}
      </span>
    </span>
  );
}

export function PanelProfileIdentity({ profileKey, name, email }: {
  profileKey: string;
  name?: string;
  email: string;
}) {
  const { reduceMotion } = usePreferences();
  const hydrated = useSyncExternalStore(noSubscription, () => true, serverSnapshot);
  const systemReduced = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(motionQuery).matches,
    serverSnapshot,
  );
  const seen = useSyncExternalStore(noSubscription, () => revealedProfiles.has(profileKey), serverSnapshot);
  const [played, setPlayed] = useState(false);
  const revealed = seen || played || reduceMotion || systemReduced;
  const fullName = name?.trim();
  const heading = fullName || email;
  const initials = (fullName ? fullName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("") : email.slice(0, 2)).toUpperCase();

  return (
    <SkeletonReveal
      className="h-11 w-full min-w-0 max-w-72"
      layerClassName="flex items-center gap-2.5 sm:gap-3"
      revealed={revealed}
      pulsing={hydrated && !revealed}
      onPulseEnd={() => {
        revealedProfiles.add(profileKey);
        setPlayed(true);
      }}
      skeleton={
        <>
          <span className="size-9 shrink-0 rounded-full bg-secondary sm:size-10" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="h-3 w-3/4 max-w-32 rounded bg-secondary" />
            <span className="h-2.5 w-full max-w-40 rounded bg-secondary" />
          </span>
        </>
      }
    >
      <Avatar aria-hidden="true" className="size-9 border-border sm:size-10">
        <AvatarFallback className="bg-accent text-accent-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" title={heading}>{heading}</p>
        {fullName && <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>}
      </div>
    </SkeletonReveal>
  );
}
