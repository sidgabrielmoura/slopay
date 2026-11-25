"use client";

import { useQuery } from "@tanstack/react-query";
import { Fingerprint, ScanFace } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonReveal } from "@/components/ui/skeleton-reveal";
import { ToastNotice } from "@/components/ui/toast-notice";
import { SecurityMethod } from "@/features/account/components/security-layout";
import { authEntry } from "@/lib/auth-navigation";
import { supportOwnerConfirmationMessage } from "@/lib/support-scope";
import { authApiService } from "@/services/auth-api.service";
import { canUseWebAuthn, isIphoneOrIpad, passkeyFailureMessage, rememberBrowserPasskey, authenticateWithPasskey } from "../passkey-device";
import { AuthActionButton } from "./auth-form-controls";

export function PasskeySettings({ userId, returnTo, ownerConfirmationRequired = false }: {
  userId: string; returnTo: string; ownerConfirmationRequired?: boolean;
}) {
  const [device, setDevice] = useState<{ available: boolean; apple: boolean }>();
  const [testing, setTesting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const session = useQuery({
    queryKey: ["security-session", userId],
    queryFn: () => authApiService.sessionStatus(),
    retry: false,
    enabled: !ownerConfirmationRequired,
    staleTime: 60_000,
  });

  useEffect(() => {
    setDevice({ available: canUseWebAuthn(), apple: isIphoneOrIpad() });
  }, []);

  const status = session.data;
  const available = status?.passkeysEnabled && device?.available;
  const loading = session.isPending || !device;
  const label = confirmed ? "Confirmada neste aparelho" : status?.hasPasskey ? "Cadastrada na conta"
    : status ? (available ? "Sem chave cadastrada" : "Indisponível") : "Status indisponível";
  const title = device?.apple ? "Face ID ou Touch ID" : "Biometria";
  const enrollment = authEntry("/ativar-biometria", returnTo) + (status?.hasPasskey ? "&modo=recadastrar" : "");

  async function testKey() {
    if (testing) return;
    setTesting(true);
    setConfirmed(false);
    setError("");
    try {
      const { options } = await authApiService.passkeyTestOptions();
      if (!options) {
        await session.refetch();
        setError("Nenhuma chave foi encontrada para a conta neste endereço.");
        return;
      }
      const credential = await authenticateWithPasskey(options, "device");
      await authApiService.testPasskey(credential);
      rememberBrowserPasskey(userId);
      setConfirmed(true);
    } catch (failure) {
      setError(passkeyFailureMessage(failure, "device"));
    } finally {
      setTesting(false);
    }
  }

  if (ownerConfirmationRequired) return <SecurityMethod icon={Fingerprint} title={title}
    description={supportOwnerConfirmationMessage}
    action={<Button type="button" variant="outline" className="h-11" disabled>Gerenciar biometria</Button>} />;

  return (
    <><SecurityMethod
      icon={device?.apple ? ScanFace : Fingerprint}
      title={title}
      description={status?.hasPasskey && !confirmed
        ? "Verifique se a chave funciona neste aparelho."
        : "Confirme o acesso com a chave deste aparelho."}
      status={(
        <div role="status">
          <span className="sr-only">{loading ? "Consultando chave de acesso" : label}</span>
          <SkeletonReveal flow revealed={!loading} skeleton={<Skeleton className="h-5.5 w-24 rounded-full animate-none" />}>
            <Badge aria-hidden="true" variant={confirmed ? "success" : "secondary"}>{label}</Badge>
          </SkeletonReveal>
        </div>
      )}
      action={available && (
        <div className="flex flex-wrap gap-2">
          {status?.hasPasskey && (
            <AuthActionButton type="button" pending={testing} pendingLabel="Testando…" onClick={testKey}>
              Testar neste aparelho
            </AuthActionButton>
          )}
          <Button asChild variant={status?.hasPasskey ? "ghost" : "default"} className="h-11">
            <Link href={enrollment} prefetch={false}>
              {status?.hasPasskey ? "Recadastrar biometria"
                : device?.apple ? "Cadastrar Face ID ou Touch ID" : "Cadastrar biometria"}
            </Link>
          </Button>
        </div>
      )}
    />
    <ToastNotice message={error} persistent />
    </>
  );
}
