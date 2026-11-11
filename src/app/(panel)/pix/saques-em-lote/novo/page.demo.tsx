import { NewBatchScreen } from "@/features/pix-batches/components/new-batch-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Novo Saque em Lote",
};

export default function NovoLotePage() {
  return <NewBatchScreen />;
}
