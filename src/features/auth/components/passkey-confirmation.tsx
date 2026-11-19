"use client";

import {
  startAuthentication, type AuthenticationResponseJSON, type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { Fingerprint, ScanFace } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import type { PasskeyOptions } from "../passkey-contract";
import { hasPlatformPasskeySupport, isIphoneOrIpad } from "../passkey-device";
import { AuthActionButton, AuthLoadingStatus } from "./auth-form-controls";

type Challenge = { options: PublicKeyCredentialRequestOptionsJSON; issuedAt: number };
type PromptSession = { scope: string; abort: AbortController; challenge?: Challenge; pending: boolean };

export function usePasskeyConfirmation<Result>({ scope, loadOptions, verify, onSuccess, onError }: {
  scope: string | null;
  loadOptions: () => Promise<PasskeyOptions>;
  verify: (credential: AuthenticationResponseJSON) => Promise<Result>;
  onSuccess: (result: Result) => void | Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const session = useRef<PromptSession>(null);
  const [available, setAvailable] = useState<{ scope: string; supported: boolean; apple: boolean }>();
  const [codeScope, setCodeScope] = useState<string | null>(null);
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fetchOptions = useEffectEvent(loadOptions);
  const reportDiscoveryError = useEffectEvent((failure: unknown) => onError?.(failure));
  const current = available?.scope === scope ? available : undefined;
  const checking = Boolean(scope && !current);
  const busy = Boolean(scope && scope === busyScope);

  useEffect(() => {
    setAvailable(undefined);
    setCodeScope(null);
    setBusyScope(null);
    setError("");
    if (!scope) return;
    const abort = new AbortController();
    const state: PromptSession = { scope, abort, pending: false };
    session.current = state;

    async function discover() {
      try {
        if (await hasPlatformPasskeySupport() && !abort.signal.aborted) {
          const { options } = await fetchOptions();
          if (options) state.challenge = { options, issuedAt: Date.now() };
        }
      } catch (failure) {
        if (!abort.signal.aborted) reportDiscoveryError(failure);
      } finally {
        if (!abort.signal.aborted) setAvailable({ scope: state.scope, supported: Boolean(state.challenge), apple: isIphoneOrIpad() });
      }
    }
    void discover();
    return () => abort.abort();
  }, [scope]);

  async function confirm() {
    const state = session.current;
    if (!state || state.scope !== scope || state.pending || state.abort.signal.aborted) return;
    state.pending = true;
    setBusyScope(state.scope);
    setError("");
    let confirmed = false;
    try {
      if (!state.challenge || Date.now() - state.challenge.issuedAt > 90_000) {
        const { options } = await loadOptions();
        if (state.abort.signal.aborted) return;
        if (!options) {
          setAvailable({ scope: state.scope, supported: false, apple: isIphoneOrIpad() });
          return;
        }
        state.challenge = { options, issuedAt: Date.now() };
      }
      const credential = await startAuthentication({ optionsJSON: state.challenge.options });
      if (state.abort.signal.aborted) return;
      const result = await verify(credential);
      if (state.abort.signal.aborted) return;
      await onSuccess(result);
      confirmed = true;
    } catch (failure) {
      if (state.abort.signal.aborted) return;
      state.challenge = undefined;
      onError?.(failure);
      setError(failure instanceof ApiError ? failure.message : "A confirmação no aparelho foi cancelada ou não pôde ser concluída.");
    } finally {
      if (!confirmed && !state.abort.signal.aborted) {
        state.pending = false;
        setBusyScope(null);
      }
    }
  }

  return {
    busy,
    checking,
    available: current?.supported === true,
    showPasskey: Boolean(scope && codeScope !== scope && (checking || current?.supported)),
    apple: current?.apple === true,
    error,
    confirm,
    chooseCode: () => { if (!busy) { setCodeScope(scope); setError(""); } },
    choosePasskey: () => { setCodeScope(null); setError(""); },
  };
}

type PasskeyPrompt = ReturnType<typeof usePasskeyConfirmation>;

export function PasskeyActions({ prompt, onConfirm, autoFocus }: {
  prompt: PasskeyPrompt;
  onConfirm?: () => void;
  autoFocus?: boolean;
}) {
  const Icon = prompt.apple ? ScanFace : Fingerprint;
  return (
    <div className="grid gap-2" aria-busy={prompt.busy || prompt.checking}>
      {prompt.checking ? <AuthLoadingStatus>Verificando biometria…</AuthLoadingStatus> : (
        <AuthActionButton type="button" pending={prompt.busy} pendingLabel="Aguardando confirmação…"
          autoFocus={autoFocus} onClick={onConfirm ?? prompt.confirm}
          endIcon={<Icon aria-hidden="true" />}>
          {prompt.apple ? "Usar Face ID ou Touch ID" : "Usar biometria"}
        </AuthActionButton>
      )}
      <Button type="button" variant="outline" className="h-11" disabled={prompt.busy} onClick={prompt.chooseCode}>
        Usar autenticador
      </Button>
      <ToastNotice message={prompt.error} persistent />
    </div>
  );
}
