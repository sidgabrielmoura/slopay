"use client";

import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, ScanFace, Smartphone } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import type { PasskeyOptions } from "../passkey-contract";
import { canUseWebAuthn, hasPlatformPasskeySupport, isIphoneOrIpad, passkeyFailureMessage,
  authenticateWithPasskey, type PasskeyMethod } from "../passkey-device";
import { AuthActionButton, AuthLoadingStatus } from "./auth-form-controls";

type Challenge = { options: PublicKeyCredentialRequestOptionsJSON; issuedAt: number };
type PromptSession = {
  scope: string;
  abort: AbortController;
  challenge?: Challenge;
  confirmation?: PasskeyOptions["sessionConfirmation"];
  pending: boolean;
  local: boolean;
};

export function usePasskeyConfirmation<Result>({ scope, loadOptions, verify, verifySession, onSuccess, onError }: {
  scope: string | null;
  loadOptions: () => Promise<PasskeyOptions>;
  verify: (credential: AuthenticationResponseJSON) => Promise<Result>;
  verifySession?: (token: string) => Promise<Result>;
  onSuccess: (result: Result) => void | Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const session = useRef<PromptSession>(null);
  const [available, setAvailable] = useState<{
    scope: string; supported: boolean; local: boolean; apple: boolean; recent: boolean;
  }>();
  const [choice, setChoice] = useState<"code" | "passkey" | null>(null);
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fetchOptions = useEffectEvent(loadOptions);
  const reportDiscoveryError = useEffectEvent((failure: unknown) => onError?.(failure));
  const allowSessionConfirmation = Boolean(verifySession);
  const current = available?.scope === scope ? available : undefined;
  const checking = Boolean(scope && !current);
  const busy = Boolean(scope && scope === busyScope);

  function rememberOptions(state: PromptSession, response: PasskeyOptions) {
    state.challenge = canUseWebAuthn() && response.options ? { options: response.options, issuedAt: Date.now() } : undefined;
    state.confirmation = allowSessionConfirmation ? response.sessionConfirmation : undefined;
  }

  function updateAvailability(state: PromptSession) {
    setAvailable({ scope: state.scope, supported: Boolean(state.challenge), local: state.local, apple: isIphoneOrIpad(),
      recent: Boolean(state.confirmation) });
  }

  const rememberDiscovery = useEffectEvent(rememberOptions);
  const showDiscovery = useEffectEvent(updateAvailability);

  useEffect(() => {
    setAvailable(undefined);
    setChoice(null);
    setBusyScope(null);
    setError("");
    if (!scope) return;
    const abort = new AbortController();
    const state: PromptSession = { scope, abort, pending: false, local: false };
    session.current = state;

    async function discover() {
      try {
        const webAuthn = canUseWebAuthn();
        if (webAuthn) state.local = await hasPlatformPasskeySupport();
        if (abort.signal.aborted) return;
        if (webAuthn || allowSessionConfirmation) {
          const response = await fetchOptions();
          if (abort.signal.aborted) return;
          rememberDiscovery(state, response);
        }
      } catch (failure) {
        if (!abort.signal.aborted) reportDiscoveryError(failure);
      } finally {
        if (!abort.signal.aborted) showDiscovery(state);
      }
    }
    void discover();
    return () => abort.abort();
  }, [scope, allowSessionConfirmation]);

  async function reloadOptions(state: PromptSession) {
    const response = await loadOptions();
    if (state.abort.signal.aborted) return;
    rememberOptions(state, response);
    updateAvailability(state);
  }

  async function confirm(method: PasskeyMethod | "session" = "device") {
    const state = session.current;
    if (!state || state.scope !== scope || state.pending || state.abort.signal.aborted) return;
    state.pending = true;
    setBusyScope(state.scope);
    setError("");
    let confirmed = false;
    try {
      let result: Result;
      if (method === "session") {
        if (!verifySession) return;
        if (!state.confirmation || Date.parse(state.confirmation.expiresAt) <= Date.now()) await reloadOptions(state);
        if (state.abort.signal.aborted || !state.confirmation) return;
        result = await verifySession(state.confirmation.token);
      } else {
        if (!state.challenge || Date.now() - state.challenge.issuedAt > 90_000) await reloadOptions(state);
        if (state.abort.signal.aborted || !state.challenge) return;
        const credential = await authenticateWithPasskey(state.challenge.options, method);
        if (state.abort.signal.aborted) return;
        result = await verify(credential);
      }
      if (state.abort.signal.aborted) return;
      await onSuccess(result);
      confirmed = true;
    } catch (failure) {
      if (state.abort.signal.aborted) return;
      if (method === "session") {
        if (failure instanceof ApiError && failure.code === "INTEGRATION_SESSION_CONFIRMATION_EXPIRED") {
          state.confirmation = undefined;
          await reloadOptions(state).catch(() => undefined);
          if (state.abort.signal.aborted) return;
        }
        setError(failure instanceof ApiError ? failure.message : "Não foi possível confirmar a operação.");
      } else {
        state.challenge = undefined;
        setError(passkeyFailureMessage(failure, method));
      }
      onError?.(failure);
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
    canConfirmWithSession: current?.recent === true,
    showPasskey: Boolean(scope && !current?.recent && choice !== "code" &&
      (checking || (current?.supported && (current.local || choice === "passkey")))),
    apple: current?.apple === true,
    error,
    confirm,
    chooseCode: () => { if (!busy) { setChoice("code"); setError(""); } },
    choosePasskey: () => { setChoice("passkey"); setError(""); },
  };
}

type PasskeyPrompt = ReturnType<typeof usePasskeyConfirmation>;

export function OperationFactorActions({ prompt, children, label = "Confirmar" }: {
  prompt: PasskeyPrompt; children: ReactNode; label?: string;
}) {
  if (prompt.canConfirmWithSession) return (
    <div className="grid gap-2">
      <AuthActionButton type="button" pending={prompt.busy} pendingLabel="Confirmando…"
        onClick={() => void prompt.confirm("session")}>
        {label}
      </AuthActionButton>
      <ToastNotice message={prompt.error} persistent />
    </div>
  );
  if (prompt.showPasskey) return <PasskeyActions prompt={prompt} autoFocus checkingLabel="Preparando confirmação…" />;
  return children;
}

export function PasskeyActions({ prompt, onConfirm, autoFocus, checkingLabel = "Consultando chaves de acesso…" }: {
  prompt: PasskeyPrompt;
  onConfirm?: (method: PasskeyMethod) => void;
  autoFocus?: boolean;
  checkingLabel?: string;
}) {
  const Icon = prompt.apple ? ScanFace : Fingerprint;
  return (
    <div className="grid gap-2" aria-busy={prompt.busy || prompt.checking}>
      {prompt.checking ? <AuthLoadingStatus>{checkingLabel}</AuthLoadingStatus> : (
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
