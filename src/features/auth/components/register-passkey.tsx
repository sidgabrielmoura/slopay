"use client";

import { startRegistration, type PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, ScanFace } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { authEntry } from "@/lib/auth-navigation";
import { authApiService } from "@/services/auth-api.service";
import { hasPlatformPasskeySupport, isIphoneOrIpad, rememberBrowserPasskey } from "../passkey-device";
import { AuthActionButton, AuthHeading } from "./auth-form-controls";

export function RegisterPasskey({ userId, returnTo }: { userId: string; returnTo: string }) {
  const [apple, setApple] = useState(false);
  const [options, setOptions] = useState<{ data: PublicKeyCredentialCreationOptionsJSON; fetchedAt: number }>();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);

  async function prepare() {
    setChecking(true);
    setRequiresLogin(false);
    try {
      const data = await authApiService.passkeyRegistrationOptions();
      setOptions({ data, fetchedAt: Date.now() });
    } catch (failure) {
      setRequiresLogin(failure instanceof ApiError && failure.status === 403);
      setError(failure instanceof ApiError ? failure.message : "Não foi possível preparar a chave de acesso.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    void hasPlatformPasskeySupport().then((supported) => {
      if (!mounted) return;
      if (!supported) {
        window.location.replace(returnTo);
        return;
      }
      setApple(isIphoneOrIpad());
      void prepare();
    });
    return () => { mounted = false; };
  }, [returnTo]);

  async function register() {
    if (busy || checking) return;
    setError("");
    setBusy(true);
    try {
      let current = options;
      if (!current || Date.now() - current.fetchedAt > 90_000) {
        current = { data: await authApiService.passkeyRegistrationOptions(), fetchedAt: Date.now() };
        setOptions(current);
      }
      const credential = await startRegistration({ optionsJSON: current.data });
      await authApiService.registerPasskey(credential);
      rememberBrowserPasskey(userId);
      window.location.replace(returnTo);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "A confirmação foi cancelada ou não pôde ser concluída.");
      await prepare();
    } finally {
      setBusy(false);
    }
  }

  const Icon = apple ? ScanFace : Fingerprint;
  return (
    <section className="flex flex-col gap-6" aria-busy={busy || checking}>
      <div className="flex flex-col items-start gap-4">
        <span className="grid size-12 place-items-center rounded-xl border border-border bg-accent text-accent-foreground">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <AuthHeading className="text-balance">{apple ? "Ativar Face ID ou Touch ID" : "Ativar biometria"}</AuthHeading>
          <p className="text-pretty text-sm text-muted-foreground">Use a verificação deste aparelho para retomar sua sessão no Slopay.</p>
        </div>
      </div>
      <div className="grid gap-2">
        {requiresLogin ? (
          <Button asChild className="h-11 w-full">
            <Link href={authEntry("/entrar", authEntry("/ativar-biometria", returnTo))} prefetch={false}>
              Entrar novamente
            </Link>
          </Button>
        ) : <AuthActionButton type="button" className="w-full" pending={busy || checking}
          pendingLabel={checking ? "Preparando…" : "Aguardando confirmação…"} onClick={register}>
          {options ? "Ativar neste aparelho" : "Tentar novamente"}
        </AuthActionButton>}
        <Button asChild variant="ghost" className="h-11 text-muted-foreground">
          <Link href={returnTo} prefetch={false}>Agora não</Link>
        </Button>
      </div>
      <ToastNotice message={error} persistent />
    </section>
  );
}
