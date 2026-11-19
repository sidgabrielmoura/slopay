import { UsersListScreen } from "@/features/users/components/users-list-screen";

export const metadata = {
  title: "Usuários",
  description: "Controle de colaboradores, permissões e perfis de acesso.",
};

export default function UsuariosPage() {
  return <UsersListScreen />;
}
