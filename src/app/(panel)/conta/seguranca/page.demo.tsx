import { SecurityScreen } from "@/features/account/components/security-screen";

export const metadata = {
  title: "Segurança & Autenticação · SloPay",
  description: "Gerencie 2FA, PIN de operações Pix e credenciais de acesso.",
};

export default function SegurancaPage() {
  return <SecurityScreen />;
}
