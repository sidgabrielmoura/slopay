"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authApiService } from "@/services/auth-api.service";
import { ProfilePhoneForm } from "./profile-phone-form";

export function LiveProfileContact({ userId, phone }: { userId: string; phone: string | null }) {
  const router = useRouter();
  async function savePhone(next: string) {
    const updated = await authApiService.updateProfilePhone(userId, next);
    router.refresh();
    return updated.phone;
  }

  return <ProfilePhoneForm phone={phone} save={savePhone} />;
}

export function ReloadProfileContact() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">Telefone indisponível.</p>
      <Button type="button" variant="outline" className="h-11" disabled={pending}
        onClick={() => startTransition(() => router.refresh())}>
        {pending ? "Atualizando…" : "Tentar novamente"}
      </Button>
    </div>
  );
}
