import { UserFormScreen } from "@/features/users/components/user-form-screen";

export const metadata = {
  title: "Editar Colaborador · SloPay",
  description: "Atualize os dados e privilégios do colaborador.",
};

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  return <UserFormScreen userId={id} />;
}
