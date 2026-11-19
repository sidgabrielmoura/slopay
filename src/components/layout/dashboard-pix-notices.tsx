"use client";

import {
  createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore,
  type ReactNode, type ReactElement,
} from "react";
import { Toaster, toast } from "sonner";
import { z } from "zod";

const noticeSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  kind: z.enum(["receive", "withdraw"]),
  status: z.string().min(1).max(32),
  title: z.string().min(1).max(120),
  amountInCents: z.int().positive(),
  tone: z.enum(["info", "success", "warning"]),
  simulated: z.boolean().optional(),
});
const entrySchema = noticeSchema.extend({ receivedAt: z.int().min(0).max(8_640_000_000_000_000), read: z.boolean() });
const historySchema = z.array(entrySchema).max(20);
const empty: PixNoticeEntry[] = [];
const getServerSnapshot = () => empty;
const noticeDuration = 7_000;

type Mode = "demo" | "sandbox";
type FocusOrigin = HTMLElement | null;
export type PixNotice = z.infer<typeof noticeSchema>;
export type PixNoticeEntry = z.infer<typeof entrySchema>;

export function pixNoticeKey(notice: Pick<PixNotice, "id" | "kind">) {
  return notice.kind + ":" + notice.id;
}

function makeStore(mode: Mode, accountId: string) {
  const toasterId = "pix-notices:" + mode + ":" + accountId;
  const storageKey = "slopay:" + toasterId;
  const listeners = new Set<() => void>();
  const actions = new Map<string, (origin: FocusOrigin) => void>();
  let entries: PixNoticeEntry[] | undefined;

  function getSnapshot() {
    if (entries) return entries;
    try {
      const stored = historySchema.safeParse(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]"));
      entries = stored.success ? stored.data : empty;
    } catch {
      entries = empty;
    }
    return entries;
  }

  function save(next: PixNoticeEntry[]) {
    entries = next;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep notices available in the current tab when storage is disabled.
    }
    for (const listener of listeners) listener();
  }

  return {
    mode,
    toasterId,
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    record(notice: PixNotice) {
      const key = pixNoticeKey(notice);
      const previous = getSnapshot().find((item) => pixNoticeKey(item) === key);
      if (previous?.status === notice.status) return false;
      save([
        { ...notice, receivedAt: Date.now(), read: false },
        ...getSnapshot().filter((item) => pixNoticeKey(item) !== key),
      ].slice(0, 20));
      return true;
    },
    markRead(key?: string) {
      const current = getSnapshot();
      if (!current.some((notice) => !notice.read && (!key || pixNoticeKey(notice) === key))) return;
      save(current.map((notice) => !key || pixNoticeKey(notice) === key ? { ...notice, read: true } : notice));
    },
    getAction: (key: string) => actions.get(key),
    registerAction(key: string, action: (origin: FocusOrigin) => void) {
      actions.set(key, action);
      return () => { if (actions.get(key) === action) actions.delete(key); };
    },
  };
}

type NoticeStore = ReturnType<typeof makeStore>;
const stores = new Map<string, NoticeStore>();
const Context = createContext<NoticeStore | null>(null);
const ignoreSubscription = () => () => undefined;

function storeFor(mode: Mode, accountId: string) {
  if (typeof window === "undefined") return makeStore(mode, accountId);
  const key = mode + ":" + accountId;
  const known = stores.get(key);
  if (known) return known;
  const store = makeStore(mode, accountId);
  stores.set(key, store);
  return store;
}

export function DashboardPixNoticesProvider({ mode, accountId, children }: {
  mode: Mode;
  accountId: string;
  children: ReactNode;
}) {
  const store = useMemo(() => storeFor(mode, accountId), [mode, accountId]);
  const offset = { right: "1rem", bottom: "var(--pix-toast-bottom)" };

  return (
    <Context.Provider value={store}>
      {children}
      <Toaster
        id={store.toasterId}
        position="bottom-right"
        theme="dark"
        expand
        visibleToasts={2}
        hotkey={["altKey", "KeyN"]}
        containerAriaLabel="Avisos de operações Pix"
        offset={offset}
        mobileOffset={offset}
        className="[--pix-toast-bottom:calc(4.75rem+env(safe-area-inset-bottom))] lg:[--pix-toast-bottom:1.5rem]"
        style={{ zIndex: 40, fontFamily: "inherit" }}
      />
    </Context.Provider>
  );
}

export function useDashboardPixNotices() {
  const store = useContext(Context);
  const notices = useSyncExternalStore(
    store?.subscribe ?? ignoreSubscription,
    store?.getSnapshot ?? getServerSnapshot,
    getServerSnapshot,
  );
  return { store, notices };
}

export function DashboardPixNotice({ notice, visible, onOpen, renderToast }: {
  notice?: PixNotice;
  visible: boolean;
  onOpen?: (origin: FocusOrigin) => void;
  renderToast: (dismiss: () => void) => ReactElement;
}) {
  const store = useContext(Context);
  const pending = useRef<string | null>(null);
  const active = useRef<string | number | null>(null);
  const openAction = useRef(onOpen);
  const key = notice && pixNoticeKey(notice);
  const canOpen = Boolean(onOpen);

  useLayoutEffect(() => { openAction.current = onOpen; }, [onOpen]);
  useLayoutEffect(() => {
    if (store && key && canOpen) return store.registerAction(key, (origin) => openAction.current?.(origin));
  }, [store, key, canOpen]);

  useEffect(() => () => {
    if (active.current !== null) toast.dismiss(active.current);
    active.current = null;
  }, [store, key]);

  useEffect(() => {
    if (!store || !notice || !key) return;
    const event = key + ":" + notice.status;
    if (store.record(notice)) pending.current = event;
    if (!visible) {
      if (active.current !== null) toast.dismiss(active.current);
      active.current = null;
      return;
    }
    if (pending.current !== event) return;

    const timer = window.setTimeout(() => {
      if (active.current !== null) toast.dismiss(active.current);
      pending.current = null;
      active.current = toast.custom((id) => renderToast(() => toast.dismiss(id)), {
        toasterId: store.toasterId,
        duration: noticeDuration,
        unstyled: true,
        className: "w-[min(22rem,calc(100vw-2rem))]",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [store, key, notice, visible, renderToast]);

  return null;
}
