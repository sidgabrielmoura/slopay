"use client";

import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, LockKeyhole, ScanFace, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { authEntry } from "@/lib/auth-navigation";
import { authApiService, type SessionStatus } from "@/services/auth-api.service";
import { canUseWebAuthn, hasPlatformPasskeySupport, isIphoneOrIpad, passkeyFailureMessage,
  authenticateWithPasskey, type PasskeyMethod } from "../passkey-device";
import { refreshSessionIfActive, sessionCanResume, sessionEnded, sessionErrorCode, withSessionLock } from "../session-refresh";
import { redirectExpiredSession } from "../session-expiry";
import { AuthActionButton, AuthHeading, AuthLoadingStatus } from "./auth-form-controls";
import { AuthPasswordField } from "./auth-password-field";
import { CodeSlots, useCodeVerification } from "./code-slots";

type Method = "passkey" | "password";

export function RenewSession({ returnTo }: { returnTo: string }) {
  const login = authEntry("/entrar", returnTo);
  const [status, setStatus] = useState<SessionStatus>();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("password");
  const [apple, setApple] = useState(false);
  const [canUsePasskey, setCanUsePasskey] = useState(false);
  const [options, setOptions] = useState<{ data: PublicKeyCredentialRequestOptionsJSON; fetchedAt: number }>();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const resume = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let mounted = true;
    let retry: number | undefined;
    async function check() {
      try {
        const current = await refreshSessionIfActive();
        if (!mounted) return;
        if (current.state === "active") {
          window.location.replace(returnTo);
          return;
        }
        const available = current.hasPasskey && canUseWebAuthn();
        const platform = available && await hasPlatformPasskeySupport();
        if (!mounted) return;
        setStatus(current);
        setApple(isIphoneOrIpad());
        setCanUsePasskey(available);
        setMethod(platform ? "passkey" : "password");
        setOpen(true);
        if (available) {
          const data = await authApiService.passkeyUnlockOptions();
          if (mounted) setOptions({ data, fetchedAt: Date.now() });
        }
      } catch (failure) {
        if (!mounted) return;
        if (sessionEnded(failure)) {
          setOpen(false);
          redirectExpiredSession(returnTo);
        }
        else if (sessionCanResume(failure)) retry = window.setTimeout(check, 800);
        else setError(failure instanceof ApiError ? failure.message : "Não foi possível consultar a sessão.");
      } finally {
        if (mounted) setChecking(false);
      }
    }
    void check();
    return () => { mounted = false; window.clearTimeout(retry); };
  }, [attempt, returnTo]);

  useEffect(() => {
    if (!status) return;
    const expires = Date.parse(status.absoluteExpiresAt);
    const timer = window.setTimeout(() => {
      setOpen(false);
      redirectExpiredSession(returnTo);
    }, Math.max(0, expires - Date.now()));
    return () => window.clearTimeout(timer);
  }, [returnTo, status]);

  function fail(failure: unknown, fallback: string) {
    if (sessionEnded(failure)) {
      setOpen(false);
      redirectExpiredSession(returnTo);
    }
    else if (sessionCanResume(failure)) setAttempt((value) => value + 1);
    else setError(failure instanceof ApiError ? failure.message : fallback);
  }

  async function unlockWithPasskey(method: PasskeyMethod) {
    if (busy || checking) return;
    setError("");
    setBusy(true);
    try {
      let current = options;
      if (!current || Date.now() - current.fetchedAt > 90_000) {
        current = { data: await authApiService.passkeyUnlockOptions(), fetchedAt: Date.now() };
        setOptions(current);
      }
      const credential = await authenticateWithPasskey(current.data, method);
      await withSessionLock(() => authApiService.unlockWithPasskey(credential));
      window.location.replace(returnTo);
    } catch (failure) {
      setOptions(undefined);
      fail(failure, passkeyFailureMessage(failure, method));
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const entered = String(new FormData(event.currentTarget).get("password") ?? "");
    if (status?.requiresMfa) {
      setPassword(entered);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await withSessionLock(() => authApiService.unlockWithPassword(entered));
      window.location.replace(returnTo);
    } catch (failure) {
      fail(failure, "Não foi possível confirmar o acesso.");
    } finally {
      setBusy(false);
    }
  }

  const Icon = method === "password" ? LockKeyhole : apple ? ScanFace : Fingerprint;
  return (
    <Drawer direction="bottom" open={open} dismissible={!busy} onOpenChange={(next) => {
      setOpen(next);
      if (!next) {
        setPassword("");
        setMethod(canUsePasskey ? "passkey" : "password");
      }
    }}>
      <section className="flex flex-col gap-5">
        <AuthHeading className="text-balance">Continuar sessão</AuthHeading>
        {!status && checking ? <AuthLoadingStatus>Verificando sua sessão…</AuthLoadingStatus> : (
          <>
            <p className="text-pretty text-sm text-muted-foreground">Confirme sua identidade para voltar ao Slopay.</p>
            {status ? (
              <DrawerTrigger asChild>
                <Button ref={resume} type="button" className="h-11">Confirmar identidade</Button>
              </DrawerTrigger>
            ) : (
              <Button type="button" className="h-11" onClick={() => {
                setChecking(true);
                setError("");
                setAttempt((value) => value + 1);
              }}>Tentar novamente</Button>
            )}
          </>
        )}
        <Link href={login} prefetch={false} className="w-fit text-sm text-primary hover:underline">Entrar novamente</Link>
        <ToastNotice message={!open ? error : null} persistent />

        <DrawerContent
          className="bg-card outline-none data-[vaul-drawer-direction=bottom]:max-h-[90dvh] data-[vaul-drawer-direction=bottom]:rounded-t-2xl sm:mx-auto sm:max-w-md sm:border-x"
          onOpenAutoFocus={(event) => {
            if (heading.current) {
              event.preventDefault();
              heading.current.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            resume.current?.focus();
          }}
        >
          <div className="relative grid min-h-0 gap-5 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="absolute right-3 top-3" disabled={busy}>
                <X aria-hidden="true" />
              </Button>
            </DrawerClose>
            <DrawerHeader className="items-start gap-1 px-0 py-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <span className="mb-2 grid size-11 place-items-center rounded-xl border border-border bg-accent text-accent-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <DrawerTitle ref={heading} tabIndex={-1} className="text-lg outline-none">
                {password ? "Confirmar código" : method === "passkey" ? "Desbloquear sessão" : "Confirmar senha"}
              </DrawerTitle>
              <DrawerDescription className="text-pretty">
                {password ? "Confirme com seu autenticador ou um código de recuperação."
                  : method === "passkey" ? "Use a verificação deste aparelho para continuar."
                    : "Informe a senha da sua conta Slopay."}
              </DrawerDescription>
            </DrawerHeader>

            {method === "passkey" ? (
              <div className="grid gap-2">
                <AuthActionButton type="button" pending={busy || checking}
                  pendingLabel={checking ? "Preparando…" : "Aguardando confirmação…"} onClick={() => unlockWithPasskey("device")}>
                  {apple ? "Usar Face ID ou Touch ID" : "Usar neste aparelho"}
                </AuthActionButton>
                <Button type="button" variant="outline" className="h-11" disabled={busy || checking} onClick={() => unlockWithPasskey("phone")}>
                  Usar celular
                </Button>
                <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => { setMethod("password"); setError(""); }}>
                  {status?.requiresMfa ? "Usar autenticador" : "Usar senha"}
                </Button>
              </div>
            ) : password ? (
              <UnlockCode password={password}
                onSuccess={() => window.location.replace(returnTo)}
                onBack={() => setPassword("")}
                onError={(failure) => fail(failure, "Não foi possível confirmar o código.")} />
            ) : (
              <form onSubmit={submitPassword} className="grid gap-3" aria-busy={busy}>
                <AuthPasswordField id="unlock-password" name="password" label="Senha"
                  autoComplete="current-password" required maxLength={128} />
                <AuthActionButton pending={busy} pendingLabel="Validando…">Continuar</AuthActionButton>
                {canUsePasskey && (
                  <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={() => { setMethod("passkey"); setError(""); }}>
                    Usar chave de acesso
                  </Button>
                )}
              </form>
            )}
            <ToastNotice message={open ? error : null} persistent />
          </div>
        </DrawerContent>
      </section>
    </Drawer>
  );
}

function UnlockCode({ password, onSuccess, onBack, onError }: {
  password: string;
  onSuccess: () => void;
  onBack: () => void;
  onError: (error: unknown) => void;
}) {
  const [recovery, setRecovery] = useState(false);
  const verification = useCodeVerification({
    verify: async (code) => {
      try {
        return await withSessionLock(() => authApiService.unlockWithPassword(password, code));
      } catch (failure) {
        if (sessionErrorCode(failure) === "INVALID_UNLOCK_PASSWORD") {
          onBack();
          onError(failure);
        } else if (sessionEnded(failure) || sessionCanResume(failure)) {
          onError(failure);
        }
        throw failure;
      }
    },
    onSuccess,
    isRejection: (failure) => sessionErrorCode(failure) === "INVALID_UNLOCK_CODE",
    failureMessage: "Não foi possível confirmar o código.",
  });

  return (
    <div className="grid gap-3">
      <CodeSlots key={String(recovery)} id="unlock-code" label={recovery ? "Código de recuperação" : "Código de autenticação"}
        format={recovery ? "recovery-code" : "totp"} autoFocus {...verification.field} />
      <div className="flex flex-wrap gap-x-4">
        <Button type="button" variant="link" className="h-11 px-0" disabled={verification.busy} onClick={() => {
          verification.reset();
          setRecovery(!recovery);
        }}>{recovery ? "Usar aplicativo autenticador" : "Usar código de recuperação"}</Button>
        <Button type="button" variant="link" className="h-11 px-0" disabled={verification.busy} onClick={onBack}>Voltar à senha</Button>
      </div>
    </div>
  );
}
