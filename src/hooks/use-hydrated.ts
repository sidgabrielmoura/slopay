"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Each streamed boundary keeps its server snapshot until its own hydration ends.
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
