import { UsersListScreen } from "@/features/users/components/users-list-screen";

export const metadata = {
  title: "Gestão de Usuários · SloPay",
  description: "Controle de colaboradores, permissões e perfis de acesso.",
};

export default function UsuariosPage() {
  return <UsersListScreen />;
}
