"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query-keys";
import { formatBrazilianInput, maskCPF } from "@/lib/validators";
import { useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import { ProfileHeading, ProfileLayout } from "./profile-layout";
import { ProfilePhoneForm } from "./profile-phone-form";

const roleNames = {
  TITULAR: "Titular",
  OPERADOR: "Operador",
  APROVADOR: "Aprovador",
  CONSULTA: "Consulta",
  ADMINISTRADOR: "Administrador",
};

export function ProfileScreen() {
  const service = useGatewayService();
  const { currentUser, activeScenario, isReadOnly, refreshSession } = useDemoScenario();
  const queryClient = useQueryClient();

  if (!currentUser) {
    return (
      <div className="grid max-w-5xl gap-5" aria-busy="true">
        <ProfileHeading />
        <span role="status" className="sr-only">Carregando perfil</span>
        <Skeleton className="h-44 motion-reduce:animate-none" />
        <Skeleton className="h-36 motion-reduce:animate-none" />
      </div>
    );
  }

  const userId = currentUser.id;
  async function savePhone(phone: string) {
    const response = await service.updateProfile(phone, userId);
    void refreshSession();
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    return response.phone;
  }

  return (
    <ProfileLayout
      name={currentUser.name}
      email={currentUser.email}
      role={roleNames[currentUser.role]}
      active={currentUser.status === "ACTIVE"}
      document={maskCPF(currentUser.document) || null}
      contact={isReadOnly || currentUser.status !== "ACTIVE" ? (
        <dl className="grid gap-1">
          <dt className="text-sm text-muted-foreground">Telefone de contato</dt>
          <dd className="text-sm font-medium tabular-nums">
            {formatBrazilianInput("PHONE", currentUser.phone) || "Indisponível"}
          </dd>
        </dl>
      ) : (
        <ProfilePhoneForm key={`${activeScenario}:${userId}`} phone={currentUser.phone} save={savePhone} />
      )}
    />
  );
}
