import type { UserRole, UserStatus } from "@/types/domain";

export const usersPath = "/conta/usuarios";
export const newUserPath = usersPath + "/novo";

export const userRoles = {
  TITULAR: { label: "Titular", description: "Administra a conta e as regras de aprovação." },
  OPERADOR: { label: "Operador", description: "Emite cobranças e solicita saques conforme as regras da conta." },
  APROVADOR: { label: "Aprovador", description: "Analisa as solicitações que precisam de aprovação." },
  CONSULTA: { label: "Consulta", description: "Consulta as movimentações e os relatórios da conta." },
  ADMINISTRADOR: { label: "Administrador", description: "Administra os acessos e as configurações do ambiente." },
} satisfies Record<UserRole, { label: string; description: string }>;

export const userStatusLabels = { ACTIVE: "Ativo", INACTIVE: "Inativo" } satisfies Record<UserStatus, string>;
