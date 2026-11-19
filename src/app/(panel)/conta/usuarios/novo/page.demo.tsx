import { UserFormScreen } from "@/features/users/components/user-form-screen";

export const metadata = {
  title: "Novo usuário",
  description: "Cadastre um novo usuário com papel e acessos granulares.",
};

export default function NovoUsuarioPage() {
  return <UserFormScreen />;
}
