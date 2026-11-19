"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { AccountPreferencesScope, usePreferences } from "@/providers/preferences-provider";
import { adminPreferences, adminPreferencesKey, type AdminPreferenceChanges, type AdminPreferencesView } from "../admin-preferences";
import { retryAdminRead } from "../admin-query";

type AdminPreferencesContext = {
  view?: AdminPreferencesView;
  loading: boolean;
  saving: boolean;
  readError: string | null;
  retry: () => void;
  save: (changes: AdminPreferenceChanges) => Promise<AdminPreferencesView | null>;
};

const Context = createContext<AdminPreferencesContext | undefined>(undefined);

export function useAdminPreferences() {
  const preferences = useContext(Context);
  if (!preferences) throw new Error("Preferências administrativas exigem o contexto do painel.");
  return preferences;
}

export function AdminPreferencesProvider({ accountId, children }: { accountId: string; children: ReactNode }) {
  const local = usePreferences();
  const client = useQueryClient();
  const saving = useRef(false);
  const key = adminPreferencesKey(accountId);
  const query = useQuery({
    queryKey: key, queryFn: ({ signal }) => adminPreferences.read(signal),
    retry: retryAdminRead, staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const denied = query.error instanceof ApiError && [401, 403].includes(query.error.status);
  const current = denied ? undefined : query.data;
  const appearance = { density: local.density, hideValues: local.hideValues, reduceMotion: local.reduceMotion };
  // Until the first save, inherit this browser's existing presentation preferences.
  const view = current && (current.updatedAt !== null || local.preferencesReady) ? {
    ...current, preferences: current.updatedAt === null ? { ...current.preferences, ...appearance } : current.preferences,
  } : undefined;
  const mutation = useMutation({
    mutationFn: adminPreferences.save,
    onMutate: () => client.cancelQueries({ queryKey: key, exact: true }),
    onSuccess: async (saved) => {
      await client.cancelQueries({ queryKey: key, exact: true });
      client.setQueryData(key, saved);
    },
    onError: (error) => {
      toast.error(error.message);
      // A response can be lost after a successful write. Reconcile with the stored settings.
      void client.invalidateQueries({ queryKey: key, exact: true });
    },
  });

  async function save(changes: AdminPreferenceChanges) {
    if (!view || saving.current) return null;
    saving.current = true;
    try {
      return await mutation.mutateAsync({ changes, ...(view.updatedAt === null && { initialAppearance: appearance }) });
    } catch {
      return null;
    } finally {
      saving.current = false;
    }
  }

  const visible = view?.preferences ?? appearance;
  const hideValues = !view || visible.hideValues || (mutation.isPending && mutation.variables?.changes.hideValues === true);

  return (
    <Context.Provider value={{ view, loading: query.isPending || Boolean(current && !view), saving: mutation.isPending,
      readError: query.error?.message ?? null, retry: () => { void query.refetch(); }, save }}>
      <AccountPreferencesScope value={{
        density: visible.density, hideValues, reduceMotion: visible.reduceMotion, preferencesReady: Boolean(view), savingPreferences: mutation.isPending,
        setDensity: (density) => { void save({ density }); },
        setHideValues: (next) => { void save({ hideValues: next }); },
        toggleHideValues: () => { void save({ hideValues: !hideValues }); },
        toggleReduceMotion: () => { void save({ reduceMotion: !visible.reduceMotion }); },
      }}>
        {children}
      </AccountPreferencesScope>
    </Context.Provider>
  );
}
