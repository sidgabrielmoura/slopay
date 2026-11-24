"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageLoadingSurface } from "@/components/ui/image-loading";
import { OperationFailure } from "@/components/ui/loading-indicator";
import { SecurityCard, SecurityMethod } from "@/features/account/components/security-layout";
import { ApiError } from "@/lib/api-client";
import { emailVerificationPath } from "@/lib/auth-navigation";
import { finishSignIn } from "../finish-sign-in";
import { AuthActionButton, AuthField, AuthHeading, AuthSuccessMark } from "./auth-form-controls";
import { AuthFormMotion } from "./auth-motion";
import { CodeSlots, useCodeVerification } from "./code-slots";
import { LogoutButton } from "./live-auth-forms";
import { PasskeyActions, usePasskeyConfirmation } from "./passkey-confirmation";
import { authApiService } from "@/services/auth-api.service";

export function LiveMfa({ userId, enabled, panelPath, needsEmailConfirmation = false, showLogout = true, animateSteps = false, panel }: {
  userId: string;
  enabled: boolean;
  panelPath: "/inicio" | "/admin";
  needsEmailConfirmation?: boolean;
  showLogout?: boolean;
  animateSteps?: boolean;
  panel?: { biometrics: ReactNode };
}) {
  const router = useRouter();
  const [replacing, setReplacing] = useState(false);
  const [pending, setPending] = useState<{ secret: string; qrCodeUri: string }>();
  const [codes, setCodes] = useState<string[]>();
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreFocus = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const currentPasskey = usePasskeyConfirmation({
    scope: enabled && replacing && !pending && !codes ? "replace-authenticator" : null,
    loadOptions: authApiService.passkeyReplacementOptions,
    verify: (credential) => {
      if (!formRef.current) return Promise.reject(new ApiError("Reabra o formulário para confirmar a troca.", 400));
      const password = String(new FormData(formRef.current).get("password") ?? "");
      return authApiService.setup2FA(password, { credential });
    },
    onSuccess: setPending,
  });
  const currentFactor = useCodeVerification({
    verify: ({ password, code }: { password: string; code: string }) => authApiService.setup2FA(password, { currentCode: code }),
    onSuccess: setPending,
    isRejection: (failure) => failure instanceof ApiError && (failure.status === 400 || failure.status === 401),
    failureMessage: "Não foi possível preparar o autenticador.",
  });
  const newFactor = useCodeVerification({
    verify: authApiService.verify2FA,
    onSuccess: ({ backupCodes }) => {
      setPending(undefined);
      setCodes(backupCodes);
    },
    isRejection: (failure) => failure instanceof ApiError && failure.status === 400,
    failureMessage: "Não foi possível confirmar o autenticador.",
  });

  function returnToSecurity() {
    restoreFocus.current = true;
    setReplacing(false);
    setPending(undefined);
    setCodes(undefined);
    setError(null);
    currentFactor.reset();
    newFactor.reset();
  }

  function verifyCurrentFactor(form: HTMLFormElement, code: string) {
    if (currentFactor.busy || !/^[0-9]{6}$/.test(code)) return;
    const codeInput = form.elements.namedItem("current-code");
    if (codeInput instanceof HTMLInputElement && codeInput.readOnly) return;
    if (!form.reportValidity()) return;
    void currentFactor.field.onComplete({ password: String(new FormData(form).get("password") ?? ""), code });
  }

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const data = new FormData(event.currentTarget);
    if (enabled) {
      if (currentPasskey.showPasskey) {
        if (!currentPasskey.checking) void currentPasskey.confirm();
      } else {
        verifyCurrentFactor(event.currentTarget, String(data.get("current-code") ?? ""));
      }
      return;
    }

    setBusy(true);
    setError(null);
    try {
      setPending(await authApiService.setup2FA(String(data.get("password") ?? "")));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível configurar o 2FA.");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecoveryCodes() {
    if (!codes || copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Códigos de recuperação copiados.");
    } catch {
      toast.error("Não foi possível copiar os códigos. Selecione-os para copiar.");
    } finally {
      setCopying(false);
    }
  }

  function renderStep(step: number, content: ReactNode) {
    if (panel) {
      return (
        <Card className="min-w-0">
          <CardContent className="max-w-xl p-5 sm:p-6">{content}</CardContent>
        </Card>
      );
    }
    return animateSteps
      ? <AuthFormMotion step={step} animateOnMount={false}>{content}</AuthFormMotion>
      : content;
  }

  const Heading = panel ? "h2" : AuthHeading;
  const headingStyle = panel ? "text-balance text-xl font-semibold" : undefined;
  const preparing = busy || currentFactor.busy || currentPasskey.busy;

  if (codes) {
    return renderStep(2,
      <section className="space-y-5" aria-labelledby="backup-heading">
        <header className="space-y-3">
          <AuthSuccessMark />
          <Heading id="backup-heading" className={headingStyle}>Códigos de recuperação</Heading>
        </header>
        <p className="text-sm text-muted-foreground">
          Guarde os códigos em local seguro. Cada código pode ser usado uma vez.
        </p>
        <div className={panel
          ? "relative rounded-lg border border-border bg-background p-4 pt-14"
          : "relative rounded-md border border-border bg-card p-4 pt-14"}>
          <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 size-11 text-muted-foreground"
            aria-label="Copiar todos os códigos de recuperação" title="Copiar todos os códigos de recuperação"
            aria-busy={copying} disabled={copying} onClick={copyRecoveryCodes}>
            <Copy aria-hidden="true" />
          </Button>
          <ol aria-label="Códigos de recuperação" className={panel
            ? "grid gap-2 font-mono text-sm sm:grid-cols-2"
            : "grid gap-2 font-mono text-sm"}>
            {codes.map((code, index) => <li key={index} className="min-w-0 break-all">{index + 1} - {code}</li>)}
          </ol>
        </div>
        <AuthActionButton type="button" pending={busy} pendingLabel="Continuando…" autoFocus={Boolean(panel)} onClick={() => {
          if (enabled) returnToSecurity();
          else {
            setBusy(true);
            if (needsEmailConfirmation) router.replace(emailVerificationPath);
            else void finishSignIn(userId, panelPath);
          }
        }}>
          Continuar
        </AuthActionButton>
      </section>,
    );
  }

  if (enabled && !replacing && panel) {
    const replace = (
      <Button type="button" variant="outline" className="h-11 border-border" onClick={() => setReplacing(true)}
        ref={(button) => {
          if (button && restoreFocus.current) {
            button.focus();
            restoreFocus.current = false;
          }
        }}>
        Trocar autenticador
      </Button>
    );
    return (
      <SecurityCard title="Métodos de acesso">
        <div className="divide-y divide-border">
          {panel.biometrics}
          <SecurityMethod
            icon={Smartphone}
            title="Aplicativo autenticador"
            description="Use os códigos do aplicativo como alternativa à biometria."
            status={<Badge variant="success">Ativo</Badge>}
            action={replace}
          />
        </div>
      </SecurityCard>
    );
  }

  return renderStep(pending ? 1 : 0,
    <section className="space-y-5">
      <header className="space-y-2">
        <Heading className={headingStyle}>
          {enabled ? "Trocar autenticador" : "Ativar autenticação em dois fatores"}
        </Heading>
        <p className="text-sm text-muted-foreground">
          {pending ? "Escaneie o QR Code ou digite a chave no aplicativo autenticador." : "Confirme sua identidade para configurar o autenticador."}
        </p>
      </header>
      {(pending || preparing) && (
        <div className={panel ? "grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-4" : "space-y-3"}>
          <ImageLoadingSurface state={pending ? "ready" : "loading"} className="size-[168px] rounded-md">
            {pending && (
              <div className="grid size-full place-items-center bg-white">
                <QRCodeSVG value={pending.qrCodeUri} title="QR Code de configuração do autenticador" size={152} marginSize={4} />
              </div>
            )}
          </ImageLoadingSurface>
          {pending
            ? <p className="text-sm">Chave manual <code className="block break-all text-primary">{pending.secret}</code></p>
            : <p className="text-sm text-muted-foreground" role="status">Preparando QR Code do autenticador…</p>}
        </div>
      )}
      {pending ? (
        <CodeSlots
          id="new-code"
          label="Código do novo autenticador"
          format="totp"
          autoFocus
          successLabel="Autenticador confirmado."
          {...newFactor.field}
        />
      ) : (
        <form ref={formRef} method="post" onSubmit={prepare}
          aria-busy={busy || currentFactor.busy || currentPasskey.busy} className="space-y-4">
          <AuthField
            id="password"
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            autoFocus={enabled}
            readOnly={busy || currentFactor.busy || currentPasskey.busy}
            onBlur={enabled ? (event) => {
              const form = event.currentTarget.form;
              if (form && event.relatedTarget === form.elements.namedItem("current-code") && event.currentTarget.value) {
                verifyCurrentFactor(form, String(new FormData(form).get("current-code") ?? ""));
              }
            } : undefined}
            onKeyDown={enabled ? (event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            } : undefined}
          />
          {enabled ? currentPasskey.showPasskey ? (
            <PasskeyActions prompt={currentPasskey} onConfirm={(method) => {
              if (formRef.current?.reportValidity()) void currentPasskey.confirm(method);
            }} />
          ) : (
            <>
              <CodeSlots
                id="current-code"
                label="Código do autenticador atual"
                format="totp"
                {...currentFactor.field}
                onComplete={(code, form) => { if (form) verifyCurrentFactor(form, code); }}
                onRetry={(code, form) => { if (form) verifyCurrentFactor(form, code); }}
              />
              {currentPasskey.available && (
                <Button type="button" variant="link" className="h-11 px-0" disabled={currentFactor.busy} onClick={() => {
                  currentFactor.reset();
                  currentPasskey.choosePasskey();
                }}>Usar chave de acesso</Button>
              )}
            </>
          ) : (
            <>
              {error && <OperationFailure message={error} />}
              <AuthActionButton pending={busy} pendingLabel="Preparando autenticador…" className="w-full">
                Preparar autenticador
              </AuthActionButton>
            </>
          )}
        </form>
      )}
      <div className="flex flex-wrap items-start gap-2">
        {enabled && (
          <Button type="button" variant="ghost" className="h-11" disabled={busy || currentPasskey.busy || (currentFactor.busy && !pending) || newFactor.busy} onClick={returnToSecurity}>
            Cancelar troca
          </Button>
        )}
        {showLogout && <LogoutButton />}
      </div>
    </section>,
  );
}
