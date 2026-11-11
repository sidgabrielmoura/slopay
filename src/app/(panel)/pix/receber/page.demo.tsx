import { ReceiveFormScreen } from "@/features/pix-receive/components/receive-form-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receber com Pix",
};

export default function ReceberPage() {
  return <ReceiveFormScreen />;
}
