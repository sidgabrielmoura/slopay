"use client";

import { startRegistration, type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, ScanFace } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlideSelect } from "@/components/ui/glide-select";
import { LoadingConfirmation } from "@/components/ui/loading-indicator";
import { ToastNotice } from "@/components/ui/toast-notice";
import { ApiError } from "@/lib/api-client";
import { authEntry } from "@/lib/auth-navigation";
import { formatDateTime } from "@/lib/dates";
import { authApiService } from "@/services/auth-api.service";
import type { PasskeyPair } from "../passkey-contract";
import { canUseWebAuthn, isIphoneOrIpad, passkeyFailureMessage, rememberBrowserPasskey, authenticateWithPasskey } from "../passkey-device";
import { AuthActionButton, AuthHeading } from "./auth-form-controls";
import { AuthFormMotion } from "./auth-motion";
import { PasskeyReauthentication } from "./passkey-reauthentication";

type Prepared<T> = { options: T; fetchedAt: number };

function fresh<T>(prepared: Prepared<T> | undefined) {
  return prepared && Date.now() - prepared.fetchedAt < 90_000 ? prepared.options : undefined;
}

export function RegisterPasskey({ userId, returnTo, renew = false }: { userId: string; returnTo: string; renew?: boolean }) {
  const [device, setDevice] = useState<{ available: boolean; apple: boolean }>();
  const [preparedEnrollment, setPreparedEnrollment] = useState<Prepared<PublicKeyCredentialCreationOptionsJSON>>();
  const [preparedReplacement, setPreparedReplacement] = useState<Prepared<PublicKeyCredentialRequestOptionsJSON>>();
  const [selection, setSelection] = useState("");
  const [pair, setPair] = useState<PasskeyPair>();
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(!renew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"factor" | "login" | null>(null);
  const credentials = useQuery({
    queryKey: ["passkeys-for-replacement", userId],
    queryFn: authApiService.passkeyCredentials,
    enabled: renew && device?.available === true,
    retry: false, refetchOnWindowFocus: false,
  });
  const keys = credentials.data?.credentials ?? [];
  const replaceId = keys.length === 1 ? keys[0]?.id : keys.find((key) => key.id === selection)?.id;
  const stageLoading = !device || checking || (renew && device.available && credentials.isPending);
  const enrollmentBlocked = renew && (!credentials.data || (keys.length > 0 && !replaceId));

  useEffect(() => {
    let mounted = true;
    const available = canUseWebAuthn();
    setDevice({ available, apple: isIphoneOrIpad() });
    if (!renew && available) {
      void authApiService.passkeyRegistrationOptions().then(
        (options) => { if (mounted) setPreparedEnrollment({ options, fetchedAt: Date.now() }); },
        (failure) => { if (mounted) reportError(failure, "Não foi possível preparar a chave de acesso."); },
      ).finally(() => { if (mounted) setChecking(false); });
    } else {
      setChecking(false);
    }
    return () => { mounted = false; };
  }, [renew]);

  function reportError(failure: unknown, fallback: string) {
    if (failure instanceof ApiError && failure.code === "REAUTHENTICATION_REQUIRED") {
      setConfirmation("factor");
      setError("");
      return;
    }
    if (failure instanceof ApiError && (failure.status === 403 || failure.code === "SESSION_EXPIRED")) {
      setConfirmation("login");
    }
    setError(failure instanceof ApiError ? failure.message : fallback);
  }

  async function register() {
    if (!device?.available || busy || stageLoading || enrollmentBlocked) return;
    setBusy(true);
    setError("");
    try {
      const data = (!renew && fresh(preparedEnrollment)) || await authApiService.passkeyRegistrationOptions(replaceId);
      const credential = await startRegistration({ optionsJSON: { ...data, hints: ["client-device"] } });
      if (credential.authenticatorAttachment === "cross-platform") {
        throw new ApiError("Selecione a opção de salvar a chave neste aparelho para continuar.", 400);
      }
      const { credentialId } = await authApiService.registerPasskey(credential, replaceId);
      if (!replaceId) {
        rememberBrowserPasskey(userId);
        window.location.replace(returnTo);
        return;
      }
      const next = { replaceId, newId: credentialId };
      setPair(next);
      const options = await authApiService.passkeyRotateOptions(next);
      setPreparedReplacement({ options, fetchedAt: Date.now() });
    } catch (failure) {
      setPreparedEnrollment(undefined);
      reportError(failure, "Não foi possível cadastrar a chave neste aparelho. Confira a opção de verificação do dispositivo e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReplacement() {
    if (!pair || busy) return;
    setBusy(true);
    setError("");
    try {
      const options = fresh(preparedReplacement) ?? await authApiService.passkeyRotateOptions(pair);
      const credential = await authenticateWithPasskey(options, "device");
      await authApiService.rotatePasskey(pair, credential);
      rememberBrowserPasskey(userId);
      setDone(true);
    } catch (failure) {
      setPreparedReplacement(undefined);
      reportError(failure, passkeyFailureMessage(failure, "device"));
    } finally {
      setBusy(false);
    }
  }

  const entry = authEntry("/ativar-biometria", returnTo) + (renew ? "&modo=recadastrar" : "");
  const Icon = device?.apple ? ScanFace : Fingerprint;
  const title = confirmation === "factor" ? "Confirme sua identidade"
    : done ? "Chave de acesso recadastrada" : pair ? "Confirme a nova chave" : renew ? "Recadastrar biometria"
    : device?.apple ? "Ativar Face ID ou Touch ID" : "Ativar biometria";
  const description = confirmation === "factor" ? "Digite sua senha e o código de seis dígitos do aplicativo autenticador."
    : done ? "A chave nova está ativa neste aparelho e substituiu a chave selecionada."
    : pair ? "Use a chave que acabou de cadastrar. A chave anterior continua ativa até essa confirmação."
    : renew ? "Cadastre uma chave neste aparelho. Você vai testá-la antes de substituir a anterior."
      : "Use a verificação deste aparelho para retomar sua sessão no Slopay.";

  return (
    <AuthFormMotion step={confirmation === "factor" ? -1 : done ? 2 : pair ? 1 : 0} animateOnMount={false}>
      <section className="flex flex-col gap-6" aria-busy={busy || stageLoading}>
        <div className="flex flex-col items-start gap-4">
          {done ? <LoadingConfirmation size={48} animate /> : (
            <span className="grid size-12 place-items-center rounded-xl border border-border bg-accent text-accent-foreground">
              <Icon aria-hidden="true" className="size-6" />
            </span>
          )}
          <div className="flex flex-col gap-2">
            <AuthHeading className="text-balance">{title}</AuthHeading>
            <p className="text-pretty text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {!confirmation && !pair && renew && keys.length > 1 && (
          <GlideSelect size="lg" className="w-full" menuWidth={310} disabled={busy}
            ariaLabel="Qual chave você quer substituir?" placeholder="Selecione a chave anterior"
            value={selection} onChange={setSelection}
            options={keys.map((key, index) => ({
              value: key.id,
              label: `Chave ${index + 1} · ${formatDateTime(key.createdAt, "medium")}`,
              tag: key.lastUsedAt ? `Uso ${formatDateTime(key.lastUsedAt, "date-only")}` : "Sem uso registrado",
            }))} />
        )}
        {confirmation === "factor" && (
          <PasskeyReauthentication onSuccess={() => {
            setPreparedEnrollment(undefined);
            setPreparedReplacement(undefined);
            setConfirmation(null);
          }} />
        )}
        <div className="grid gap-2">
          {confirmation ? (
            <Button asChild variant={confirmation === "login" ? "default" : "ghost"} className="h-11 w-full">
              <Link href={authEntry("/entrar", entry)} prefetch={false}>Entrar novamente</Link>
            </Button>
          ) : !done && (
            renew && credentials.isError ? <Button type="button" variant="outline" className="h-11"
              onClick={() => void credentials.refetch()}>Tentar consultar de novo</Button>
              : device?.available === false ? <p className="text-sm text-muted-foreground">Este navegador está sem acesso às chaves de segurança.</p>
              : <AuthActionButton type="button" className="w-full" pending={busy || stageLoading}
                pendingLabel={stageLoading ? "Preparando…" : "Aguardando confirmação…"}
                disabled={!pair && enrollmentBlocked} onClick={pair ? confirmReplacement : register}>
                {pair ? "Testar e substituir chave" : "Cadastrar neste aparelho"}
              </AuthActionButton>
          )}
          <Button asChild variant={done ? "default" : "ghost"} className="h-11">
            <Link href={returnTo} prefetch={false}>{done || confirmation ? "Voltar à segurança" : "Agora não"}</Link>
          </Button>
        </div>
        <ToastNotice message={error || credentials.error?.message} persistent />
      </section>
    </AuthFormMotion>
  );
}
