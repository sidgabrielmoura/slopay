import { WithdrawFormScreen } from "@/features/pix-withdraw/components/withdraw-form-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saque Direto Pix",
};

export default function SaqueDiretoPage() {
  return <WithdrawFormScreen />;
}
