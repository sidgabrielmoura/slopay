"use client";

import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, ScanFace, Smartphone } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToastNotice } from "@/components/ui/toast-notice";
import type { PasskeyOptions } from "../passkey-contract";
import { canUseWebAuthn, hasPlatformPasskeySupport, isIphoneOrIpad, passkeyFailureMessage,
  authenticateWithPasskey, type PasskeyMethod } from "../passkey-device";
import { AuthActionButton, AuthLoadingStatus } from "./auth-form-controls";

type Challenge = { options: PublicKeyCredentialRequestOptionsJSON; issuedAt: number };
type PromptSession = { scope: string; abort: AbortController; challenge?: Challenge; pending: boolean };

export function usePasskeyConfirmation<Result>({ scope, loadOptions, verify, onSuccess, onError, fallbackToCodeOnUnavailable }: {
  scope: string | null;
  loadOptions: () => Promise<PasskeyOptions>;
  verify: (credential: AuthenticationResponseJSON) => Promise<Result>;
  onSuccess: (result: Result) => void | Promise<void>;
  onError?: (error: unknown) => void;
  fallbackToCodeOnUnavailable?: boolean;
}) {
  const session = useRef<PromptSession>(null);
  const [available, setAvailable] = useState<{ scope: string; supported: boolean; local: boolean; apple: boolean }>();
  const [choice, setChoice] = useState<"code" | "passkey" | null>(null);
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fetchOptions = useEffectEvent(loadOptions);
  const reportDiscoveryError = useEffectEvent((failure: unknown) => onError?.(failure));
  const current = available?.scope === scope ? available : undefined;
  const checking = Boolean(scope && !current);
  const busy = Boolean(scope && scope === busyScope);

  useEffect(() => {
    setAvailable(undefined);
    setChoice(null);
    setBusyScope(null);
    setError("");
    if (!scope) return;
    const abort = new AbortController();
    const state: PromptSession = { scope, abort, pending: false };
    session.current = state;

    async function discover() {
      let local = false;
      try {
        if (canUseWebAuthn()) {
          local = await hasPlatformPasskeySupport();
          if (abort.signal.aborted) return;
          const { options } = await fetchOptions();
          if (options) state.challenge = { options, issuedAt: Date.now() };
        }
      } catch (failure) {
        if (!abort.signal.aborted) reportDiscoveryError(failure);
      } finally {
        if (!abort.signal.aborted) setAvailable({ scope: state.scope, supported: Boolean(state.challenge), local, apple: isIphoneOrIpad() });
      }
    }
    void discover();
    return () => abort.abort();
  }, [scope]);

  async function confirm(method: PasskeyMethod = "device") {
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
          setAvailable({ scope: state.scope, supported: false, local: false, apple: isIphoneOrIpad() });
          return;
        }
        state.challenge = { options, issuedAt: Date.now() };
      }
      const credential = await authenticateWithPasskey(state.challenge.options, method);
      if (state.abort.signal.aborted) return;
      const result = await verify(credential);
      if (state.abort.signal.aborted) return;
      await onSuccess(result);
      confirmed = true;
    } catch (failure) {
      if (state.abort.signal.aborted) return;
      state.challenge = undefined;
      onError?.(failure);
      if (fallbackToCodeOnUnavailable && failure instanceof Error &&
          ["NotAllowedError", "NotFoundError", "NotSupportedError"].includes(failure.name)) {
        setChoice("code");
        setError("A chave de acesso não foi confirmada. Continue com o código do autenticador.");
      } else {
        setError(passkeyFailureMessage(failure, method));
      }
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
    codeSelected: choice === "code",
    showPasskey: Boolean(scope && choice !== "code" && (checking || (current?.supported && (current.local || choice === "passkey")))),
    apple: current?.apple === true,
    error,
    confirm,
    chooseCode: () => { if (!busy) { setChoice("code"); setError(""); } },
    choosePasskey: () => { setChoice("passkey"); setError(""); },
  };
}

type PasskeyPrompt = ReturnType<typeof usePasskeyConfirmation>;

export function PasskeyActions({ prompt, onConfirm, autoFocus }: {
  prompt: PasskeyPrompt;
  onConfirm?: (method: PasskeyMethod) => void;
  autoFocus?: boolean;
}) {
  const Icon = prompt.apple ? ScanFace : Fingerprint;
  return (
    <div className="grid gap-2" aria-busy={prompt.busy || prompt.checking}>
      {prompt.checking ? <AuthLoadingStatus>Consultando chaves de acesso…</AuthLoadingStatus> : (
        <AuthActionButton type="button" pending={prompt.busy} pendingLabel="Aguardando confirmação…"
          autoFocus={autoFocus} onClick={() => (onConfirm ?? prompt.confirm)("device")}
          endIcon={<Icon aria-hidden="true" />}>
          {prompt.apple ? "Usar Face ID ou Touch ID" : "Usar neste aparelho"}
        </AuthActionButton>
      )}
      {!prompt.checking && <Button type="button" variant="outline" className="h-11" disabled={prompt.busy}
        onClick={() => (onConfirm ?? prompt.confirm)("phone")}>
        <Smartphone aria-hidden="true" /> Usar celular
      </Button>}
      <Button type="button" variant="outline" className="h-11" disabled={prompt.busy} onClick={prompt.chooseCode}>
        Usar autenticador
      </Button>
      <ToastNotice message={prompt.error} persistent />
    </div>
  );
}
