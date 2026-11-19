"use client";

// React Bits Code Slots by David Haz. See code-slots.LICENSE.md.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ClipboardEvent, type MouseEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { animate, motion, motionValue, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { Input } from "@/components/ui/input";
import { ToastNotice } from "@/components/ui/toast-notice";
import { usePreferences } from "@/providers/preferences-provider";
import { AuthLoadingStatus } from "./auth-form-controls";
import styles from "./code-slots.module.css";

const codeFormats = {
  totp: 6,
  "email-otp": 6,
  "recovery-code": 32,
  "email-token": 64,
} as const;
const slotSpring = { type: "spring", duration: 0.3, bounce: 0.2 } as const;
const washEase = [0.23, 1, 0.32, 1] as const;
const cascade = 0.02;
const checkDelay = 0.28;
const checkDuration = 0.35;
const sinkDelay = 0.06;
const sinkStep = 0.03;
const sinkFade = 0.6;
const rise = 8;
const sink = 26;
const idleVerification = { status: "idle" } as const;
const emptyInput = { code: "", start: 0, end: 0 };
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const reduceMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(notify: () => void) {
  const media = window.matchMedia(reduceMotionQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

type VerificationState =
  | { status: "idle" | "pending" | "success" }
  | { status: "error" | "failed"; message: string };

type CodeSlotsProps = {
  id: string;
  label: string;
  format: keyof typeof codeFormats;
  autoFocus?: boolean;
  disabled?: boolean;
  describedBy?: string;
  pendingLabel?: string;
  successLabel?: string;
  status?: VerificationState;
  onComplete: (code: string, form: HTMLFormElement | null) => void;
  onEdit?: () => void;
  onRetry?: (code: string, form: HTMLFormElement | null) => void;
  onSuccessAnimationComplete?: () => void;
};

export function CodeSlots({
  id, label, format, autoFocus, disabled, describedBy, pendingLabel = "Verificando código…",
  successLabel = "Código aceito.", status: verification, onComplete, onEdit, onRetry, onSuccessAnimationComplete,
}: CodeSlotsProps) {
  const [{ code, start, end }, setInputState] = useState(emptyInput);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { preferencesReady, reduceMotion } = usePreferences();
  const systemReduceMotion = useSyncExternalStore(
    subscribeToMotionPreference, () => window.matchMedia(reduceMotionQuery).matches, () => true,
  );
  const animateSlots = preferencesReady && !reduceMotion && !systemReduceMotion;
  const maxLength = codeFormats[format];
  const numeric = format === "totp" || format === "email-otp";
  const charactersPerSlot = numeric ? 1 : 8;
  const slotCount = maxLength / charactersPerSlot;
  const activeSlot = Math.min(Math.floor(start / charactersPerSlot), slotCount - 1);
  const status = verification?.status ?? "idle";
  const pending = status === "pending";
  const success = status === "success";
  const rejected = status === "error";
  const failure = pasteError ?? (verification?.status === "error" || verification?.status === "failed" ? verification.message : null);
  const errorId = `${id}-error`;
  const description = [describedBy, failure && errorId].filter(Boolean).join(" ") || undefined;
  const previousCode = useRef("");
  const { fills, drops } = useMemo(() => ({
    fills: Array.from({ length: slotCount }, () => motionValue(0)),
    drops: Array.from({ length: slotCount }, () => motionValue(0)),
  }), [slotCount]);
  const open = useMotionValue(0);
  const check = useMotionValue(0);
  const washClip = useTransform(open, (progress) => `inset(0 ${(1 - clamp01(progress)) * 50}% round 12px)`);
  const checkTransform = useTransform(check, (progress) => (
    `translateY(${(1 - progress) * rise}px) scale(${0.85 + 0.15 * Math.max(progress, 0)})`
  ));
  const checkOpacity = useTransform(check, clamp01);
  const caretPosition = useMotionValue(0);
  const caretTransform = useTransform(() => {
    const active = caretPosition.get();
    let position = active;
    for (let index = 0; index < active; index++) position -= 1 - clamp01(fills[index].get());
    return `translateX(calc(${Math.max(position, 0)} * (100% + 0.5rem)))`;
  });
  const useGlidingCaret = numeric && code.length < maxLength && start === end && start === code.length;

  useLayoutEffect(() => { caretPosition.jump(rejected ? 0 : activeSlot); }, [activeSlot, caretPosition, rejected]);

  // React Bits slot springs, with one animated cell per digit or token group.
  useLayoutEffect(() => {
    const previous = previousCode.current;
    previousCode.current = code;
    if (rejected) {
      const filled = fills.slice(0, Math.ceil(code.length / charactersPerSlot)).reverse();
      if (!filled.length) {
        if (inputRef.current && document.activeElement === document.body) inputRef.current.focus();
        return;
      }
      if (!animateSlots) {
        filled.forEach((fill) => fill.jump(0));
        setInputState(emptyInput);
        return;
      }

      filled.forEach((fill, index) => animate(fill, 0, { ...slotSpring, delay: index * cascade }));
      const timer = window.setTimeout(() => setInputState(emptyInput), (slotSpring.duration + (filled.length - 1) * cascade) * 1000);
      return () => {
        window.clearTimeout(timer);
        filled.forEach((fill) => fill.stop());
      };
    }

    let delay = 0;
    fills.forEach((fill, index) => {
      const start = index * charactersPerSlot;
      const chunk = code.slice(start, start + charactersPerSlot);
      if (!animateSlots) {
        fill.jump(chunk ? 1 : 0);
      } else if (chunk !== previous.slice(start, start + charactersPerSlot)) {
        if (chunk) fill.jump(0);
        animate(fill, chunk ? 1 : 0, { ...slotSpring, delay });
        delay += cascade;
      }
    });
  }, [animateSlots, charactersPerSlot, code, fills, rejected]);

  useEffect(() => {
    if (!success) return;
    if (!animateSlots) {
      open.jump(1);
      drops.forEach((drop) => drop.jump(1));
      check.jump(1);
      onSuccessAnimationComplete?.();
      return;
    }

    const wash = animate(open, 1, { duration: 0.3, ease: washEase });
    const sinking = drops.map((drop, index) => (
      animate(drop, 1, { ...slotSpring, bounce: 0, delay: sinkDelay + index * sinkStep })
    ));
    const checkAnimation = animate(check, 1, { ...slotSpring, duration: checkDuration, delay: checkDelay });
    let stopped = false;
    void checkAnimation.then(() => { if (!stopped) onSuccessAnimationComplete?.(); });
    return () => {
      stopped = true;
      wash.stop();
      sinking.forEach((animation) => animation.stop());
      checkAnimation.stop();
    };
  }, [animateSlots, check, drops, onSuccessAnimationComplete, open, success]);

  function syncSelection(input: HTMLInputElement) {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    setInputState((previous) => previous.start === start && previous.end === end ? previous : { ...previous, start, end });
  }

  function edit(input: HTMLInputElement) {
    if (input.readOnly) return;
    const raw = input.value;
    const clean = numeric ? raw.replace(/\D/g, "") : raw;
    const position = input.selectionStart ?? raw.length;
    const start = clean === raw ? position : raw.slice(0, position).replace(/\D/g, "").length;
    const end = clean === raw ? input.selectionEnd ?? start : start;
    if (clean !== raw) {
      input.value = clean;
      input.setSelectionRange(start, end);
    }
    setInputState({ code: clean, start, end });
    if (clean === code) return;
    setPasteError(null);
    onEdit?.();
    if (clean.length === maxLength) onComplete(clean, input.form);
  }

  function pasteCode(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const clean = numeric ? text.replace(/\D/g, "") : text.trim();
    const input = event.currentTarget;
    if (input.readOnly) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const available = maxLength - input.value.length + end - start;
    if (clean.length > available) {
      event.preventDefault();
      setPasteError(numeric ? "O código tem 6 dígitos." : `O código tem ${maxLength} caracteres.`);
      return;
    }
    if (clean === text) return;
    event.preventDefault();
    if (!clean) return;
    input.setRangeText(clean, start, end, "end");
    edit(input);
  }

  function moveCaretToSlot(event: MouseEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    if (input.readOnly || event.detail !== 1 || event.shiftKey || input.selectionStart !== input.selectionEnd) return;
    const slots = input.parentElement?.querySelectorAll<HTMLElement>("[data-code-slot]");
    for (const slot of slots ?? []) {
      const bounds = slot.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) continue;

      const textBounds = slot.querySelector<HTMLElement>("[data-slot-text]")?.getBoundingClientRect();
      if (!textBounds?.width) return;
      const column = Math.round((event.clientX - textBounds.left) * charactersPerSlot / textBounds.width);
      const offset = Math.max(0, Math.min(charactersPerSlot, column));
      const position = Number(slot.dataset.codeSlot) * charactersPerSlot + offset;
      input.setSelectionRange(position, position);
      syncSelection(input);
      return;
    }
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div
        className={styles.row}
        data-status={status}
        data-single-digits={numeric || undefined}
        data-gliding-caret={useGlidingCaret || undefined}
        aria-busy={pending}
      >
        <Input
          ref={inputRef}
          id={id}
          name={id}
          type="text"
          className={styles.input}
          value={code}
          maxLength={maxLength}
          inputMode={numeric ? "numeric" : undefined}
          pattern={numeric ? "[0-9]{6}" : undefined}
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus={autoFocus}
          readOnly={disabled || pending || success || (rejected && !!code)}
          aria-invalid={rejected || !!pasteError || undefined}
          aria-describedby={description}
          onChange={(event) => edit(event.currentTarget)}
          onPaste={pasteCode}
          onSelect={(event) => syncSelection(event.currentTarget)}
          onClick={moveCaretToSlot}
        />
        {fills.map((fill, slotIndex) => {
          const first = slotIndex * charactersPerSlot;
          return (
            <Slot
              key={slotIndex}
              index={slotIndex}
              active={slotIndex === activeSlot}
              fill={fill}
              drop={drops[slotIndex]}
              chunk={code.slice(first, first + charactersPerSlot)}
              size={charactersPerSlot}
              selectionStart={start - first}
              selectionEnd={end - first}
              caretAtEnd={start === maxLength && end === start && slotIndex === slotCount - 1}
            />
          );
        })}
        <motion.span className={styles.caret} aria-hidden="true" style={{ transform: caretTransform }}>
          <span key={activeSlot} />
        </motion.span>
        <motion.span className={styles.wash} aria-hidden="true" style={{ clipPath: washClip }}>
          <motion.span className={styles.check} style={{ opacity: checkOpacity, transform: checkTransform }}>
            <HugeiconsIcon icon={Tick02Icon} size={26} strokeWidth={2.2} />
          </motion.span>
        </motion.span>
      </div>
      {pending && <AuthLoadingStatus>{pendingLabel}</AuthLoadingStatus>}
      <ToastNotice variant="success" message={success ? successLabel : null} />
      <ToastNotice message={failure} persistent />
      {failure && <span id={errorId} className="sr-only">{failure}</span>}
      {status === "failed" && onRetry && code.length === maxLength && (
        <button type="button" className="min-h-11 justify-self-start text-sm text-primary hover:underline" onClick={() => {
          inputRef.current?.focus();
          onRetry(code, inputRef.current?.form ?? null);
        }}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

function Slot({ index, active, fill, drop, chunk, size, selectionStart, selectionEnd, caretAtEnd }: {
  index: number;
  active: boolean;
  fill: MotionValue<number>;
  drop: MotionValue<number>;
  chunk: string;
  size: number;
  selectionStart: number;
  selectionEnd: number;
  caretAtEnd: boolean;
}) {
  const [shown, setShown] = useState(chunk);
  if (chunk && chunk !== shown) setShown(chunk);
  useMotionValueEvent(fill, "animationComplete", () => {
    if (!chunk && fill.get() === 0) setShown("");
  });
  useEffect(() => {
    if (!chunk && fill.get() === 0) setShown("");
  }, [chunk, fill]);
  const scale = useTransform(fill, (progress) => `scale(${Math.max(progress, 0)})`);
  const lift = useTransform([fill, drop], ([t, d]: number[]) => `translateY(${(1 - t) * rise + Math.max(d, 0) * sink}px)`);
  const ink = useTransform([fill, drop], ([t, d]: number[]) => clamp01(t) * (1 - clamp01(d / sinkFade)));

  return (
    <span className={styles.slot} aria-hidden="true" data-code-slot={index} data-active={active || undefined} data-filled={!!chunk || undefined}>
      <motion.span className={styles.fill} style={{ transform: scale }} />
      <span className={styles.characters} data-slot-text="">
        {Array.from({ length: size }, (_, offset) => (
          <span
            key={offset}
            className={styles.character}
            data-caret={caretAtEnd && offset === size - 1 ? "after" : selectionStart === selectionEnd && offset === selectionStart ? "before" : undefined}
            data-selected={offset >= selectionStart && offset < selectionEnd || undefined}
          >
            {shown[offset] && (
              <motion.span className={styles.digit} style={{ opacity: ink, transform: lift }}>{shown[offset]}</motion.span>
            )}
          </span>
        ))}
      </span>
    </span>
  );
}

export function useCodeVerification<Result, Input = string>({ verify, onSuccess, isRejection, failureMessage }: {
  verify: (code: Input) => Promise<Result>;
  onSuccess?: (result: Result) => void;
  isRejection?: (failure: unknown) => boolean;
  failureMessage: string;
}) {
  const [state, setState] = useState<VerificationState>(idleVerification);
  const lock = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const finish = useRef<(() => void) | null>(null);

  const onSuccessAnimationComplete = useCallback(() => {
    const callback = finish.current;
    finish.current = null;
    callback?.();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);

  async function complete(code: Input) {
    if (lock.current) return;
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted) return;
    lock.current = true;
    setState({ status: "pending" });
    let result: Result;
    try {
      result = await verify(code);
    } catch (failure) {
      if (signal.aborted) return;
      lock.current = false;
      setState({
        status: isRejection?.(failure) ? "error" : "failed",
        message: failure instanceof Error ? failure.message : failureMessage,
      });
      return;
    }
    if (signal.aborted) return;
    if (onSuccess) finish.current = () => { if (!signal.aborted) onSuccess(result); };
    setState({ status: "success" });
  }

  function edit() {
    if (!lock.current) setState(idleVerification);
  }

  function reset() {
    finish.current = null;
    lock.current = false;
    setState(idleVerification);
  }

  return {
    field: { status: state, onComplete: complete, onRetry: complete, onEdit: edit, onSuccessAnimationComplete },
    busy: state.status === "pending" || state.status === "success",
    reset,
  };
}
