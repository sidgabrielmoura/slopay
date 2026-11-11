"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Preferences } from "@/types/domain";

interface PreferencesContextType extends Preferences {
  setDensity: (density: "comfortable" | "compact") => void;
  toggleHideValues: () => void;
  setHideValues: (hide: boolean) => void;
  toggleReduceMotion: () => void;
}

const STORAGE_KEY = "slopay_user_preferences";

const defaultPreferences: Preferences = {
  density: "comfortable",
  hideValues: false,
  reduceMotion: false,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === "undefined") return defaultPreferences;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultPreferences, ...JSON.parse(saved) };
      }
    } catch {
      // Ignora erro de JSON/acesso
    }
    return defaultPreferences;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignora erro de cota
    }

    // Aplica classes no elemento raiz se necessário
    const root = document.documentElement;
    if (preferences.density === "compact") {
      root.classList.add("density-compact");
    } else {
      root.classList.remove("density-compact");
    }
  }, [preferences]);

  const setDensity = (density: "comfortable" | "compact") => {
    setPreferences((prev) => ({ ...prev, density }));
  };

  const toggleHideValues = () => {
    setPreferences((prev) => ({ ...prev, hideValues: !prev.hideValues }));
  };

  const setHideValues = (hideValues: boolean) => {
    setPreferences((prev) => ({ ...prev, hideValues }));
  };

  const toggleReduceMotion = () => {
    setPreferences((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  };

  return (
    <PreferencesContext.Provider
      value={{
        ...preferences,
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

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error(
      "usePreferences deve ser utilizado dentro de um PreferencesProvider"
    );
  }
  return context;
}
