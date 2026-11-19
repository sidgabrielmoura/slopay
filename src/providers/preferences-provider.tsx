"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Preferences } from "@/types/domain";

export interface PreferencesContextType extends Preferences {
  preferencesReady: boolean;
  savingPreferences?: boolean;
  setDensity: (density: "comfortable" | "compact") => void;
  toggleHideValues: () => void;
  setHideValues: (hide: boolean) => void;
  toggleReduceMotion: () => void;
}

const STORAGE_KEY = "slopay_user_preferences";
const SCOPED_PREFERENCES = "data-account-preferences";

const defaultPreferences: Preferences = {
  density: "comfortable",
  hideValues: false,
  reduceMotion: false,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

function applyPresentation(root: HTMLElement, density: Preferences["density"], reduceMotion: boolean) {
  root.classList.toggle("density-compact", density === "compact");
  root.classList.toggle("reduce-motion", reduceMotion);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [savedPreferences, setPreferences] = useState<Preferences | null>(null);
  const preferences = savedPreferences ?? defaultPreferences;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const values = JSON.parse(saved);
        setPreferences({
          density: values?.density === "compact" ? "compact" : "comfortable",
          hideValues: values?.hideValues === true,
          reduceMotion: values?.reduceMotion === true,
        });
        return;
      }
    } catch {
      // Ignora erro de JSON/acesso
    }
    setPreferences(defaultPreferences);
  }, []);

  useEffect(() => {
    if (!savedPreferences) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPreferences));
    } catch {
      // Ignora erro de cota
    }

    const root = document.documentElement;
    if (!root.hasAttribute(SCOPED_PREFERENCES)) applyPresentation(root, savedPreferences.density, savedPreferences.reduceMotion);
  }, [savedPreferences]);

  const setDensity = (density: "comfortable" | "compact") => {
    setPreferences((prev) => ({ ...(prev ?? defaultPreferences), density }));
  };

  const toggleHideValues = () => {
    setPreferences((prev) => ({ ...(prev ?? defaultPreferences), hideValues: !prev?.hideValues }));
  };

  const setHideValues = (hideValues: boolean) => {
    setPreferences((prev) => ({ ...(prev ?? defaultPreferences), hideValues }));
  };

  const toggleReduceMotion = () => {
    setPreferences((prev) => ({ ...(prev ?? defaultPreferences), reduceMotion: !prev?.reduceMotion }));
  };

  return (
    <PreferencesContext.Provider
      value={{
        ...preferences,
        preferencesReady: savedPreferences !== null,
        setDensity,
        toggleHideValues,
        setHideValues,
        toggleReduceMotion,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function AccountPreferencesScope({ value, children }: { value: PreferencesContextType; children: React.ReactNode }) {
  const local = useContext(PreferencesContext) ?? defaultPreferences;
  const { density: localDensity, reduceMotion: localMotion } = local;
  const { density, reduceMotion } = value;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(SCOPED_PREFERENCES, "");
    applyPresentation(root, density, reduceMotion);
    return () => {
      root.removeAttribute(SCOPED_PREFERENCES);
      applyPresentation(root, localDensity, localMotion);
    };
  }, [density, reduceMotion, localDensity, localMotion]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  const hydrated = useHydrated();
  if (!context) {
    throw new Error(
      "usePreferences deve ser utilizado dentro de um PreferencesProvider"
    );
  }
  // Streamed boundaries can hydrate after the provider has loaded local preferences.
  // Keep their first client render identical to the server and mask monetary values.
  return hydrated ? context : { ...context, ...defaultPreferences, preferencesReady: false };
}
