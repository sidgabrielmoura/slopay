"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./panel-notice-strip.module.css";

export type PanelNotice = {
  id: string;
  message: string;
  href?: string;
};

function ThinkingText({ message, sizer }: { message: string; sizer: string }) {
  const [text, setText] = useState({ current: message, previous: "" });
  if (text.current !== message) setText({ current: message, previous: text.current });

  return (
    <span className={styles["t-think"]}>
      <span aria-hidden="true" className={styles["t-think-sizer"]}>{sizer}</span>
      {text.previous && (
        <span key={`exit:${text.current}`} aria-hidden="true" className={cn(styles["t-think-text"], styles["is-exit"])}
          onAnimationEnd={() => setText((current) => current.current === message ? { current: message, previous: "" } : current)}>
          {text.previous}
        </span>
      )}
      <span key={text.current} className={cn(styles["t-think-text"], text.previous && styles["is-enter"])} data-current>
        {text.current}
        <span aria-hidden="true" className={styles["t-think-highlight"]} data-text={text.current} />
      </span>
    </span>
  );
}

export function PanelNoticeStrip({ entries, onCycleEnd }: {
  entries: readonly [PanelNotice, ...PanelNotice[]];
  onCycleEnd?: () => void;
}) {
  const strip = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<string>();
  const selectedIndex = entries.findIndex((entry) => entry.id === selected);
  if (selected && selectedIndex === -1) setSelected(undefined);
  const index = Math.max(0, selectedIndex);
  const entry = entries[index]!;
  const isNotice = Boolean(entry.href);
  const canAdvance = entries.length > 1 || Boolean(onCycleEnd);
  const sizer = entries.reduce((longest, item) => item.message.length > longest.length ? item.message : longest, entry.message);
  const advance = useEffectEvent(() => {
    if (index === entries.length - 1 && onCycleEnd) onCycleEnd();
    else setSelected(entries[(index + 1) % entries.length]!.id);
  });

  useEffect(() => {
    const element = strip.current;
    if (!canAdvance || !element) return;
    const hold = Number.parseFloat(getComputedStyle(element).getPropertyValue("--think-hold"));
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !element.matches(":hover, :focus-within")) advance();
    }, Number.isFinite(hold) ? hold : 12_000);
    return () => window.clearInterval(timer);
  }, [canAdvance, entry.id, isNotice]);

  return (
    <section ref={strip} aria-label="Avisos e dicas do painel" data-notice={isNotice} tabIndex={isNotice ? undefined : 0}
      className={cn(styles.strip, "relative isolate shrink-0 border-b border-primary-foreground/20 bg-primary text-primary-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-foreground")}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/images/panel-notice-moss.webp')] bg-cover bg-center opacity-35"
      />
      <div className="relative mx-auto flex min-h-12.5 w-fit max-w-full items-center justify-center gap-5! px-4 py-0.5 text-[13px]/[18px] font-semibold sm:min-h-6.5 sm:gap-3 sm:px-6 sm:py-0">
        <ThinkingText key={isNotice ? "notice" : "tip"} message={entry.message} sizer={sizer} />
        <span role="status" className="sr-only">{isNotice ? "Há avisos em aberto no painel." : ""}</span>
        {entry.href && (
          <Link href={entry.href} prefetch={false} scroll={false} aria-label={`Resolver: ${entry.message}`}
            className="inline-flex shrink-0 group items-center gap-1.5 text-xs font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-foreground sm:text-[13px]">
            Resolver<ArrowRight aria-hidden="true" className="size-4 group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
          </Link>
        )}
      </div>
    </section>
  );
}
