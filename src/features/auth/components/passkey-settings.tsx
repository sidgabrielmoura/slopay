"use client";

import { useQuery } from "@tanstack/react-query";
import { Fingerprint, ScanFace } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SecurityMethod } from "@/features/account/components/security-layout";
import { authEntry } from "@/lib/auth-navigation";
import { authApiService } from "@/services/auth-api.service";
import { hasPlatformPasskeySupport, isIphoneOrIpad } from "../passkey-device";

export function PasskeySettings({ userId, returnTo }: { userId: string; returnTo: string }) {
  const [device, setDevice] = useState<{ supported: boolean; apple: boolean }>();
  const session = useQuery({
    queryKey: ["security-session", userId],
    queryFn: () => authApiService.sessionStatus(),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    let mounted = true;
    void hasPlatformPasskeySupport().then((supported) => {
      if (mounted) setDevice({ supported, apple: isIphoneOrIpad() });
    });
    return () => { mounted = false; };
  }, []);

  const status = session.data;
  const available = status?.passkeysEnabled && device?.supported;
  const loading = session.isPending || !device;
  const label = status?.hasPasskey ? "Cadastrada"
    : status ? (available ? "Sem cadastro" : "Indisponível neste aparelho") : "Status indisponível";
  const title = device?.apple ? "Face ID ou Touch ID" : "Biometria";

  return (
    <SecurityMethod
      icon={device?.apple ? ScanFace : Fingerprint}
      title={title}
      description="Confirme o acesso e retome sua sessão com uma chave de acesso do aparelho."
      status={loading ? <Skeleton aria-hidden="true" className="h-5 w-24 motion-reduce:animate-none" /> : (
        <Badge variant={status?.hasPasskey ? "success" : "secondary"}>{label}</Badge>
      )}
      action={available && !status?.hasPasskey && (
        <Button asChild variant="outline" className="h-11">
          <Link href={authEntry("/ativar-biometria", returnTo)} prefetch={false}>
            {device?.apple ? "Cadastrar Face ID ou Touch ID" : "Cadastrar biometria"}
          </Link>
        </Button>
      )}
    />
  );
}
