import { BatchesListScreen } from "@/features/pix-batches/components/batches-list-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saques em Lote",
};

export default function SaquesEmLotePage() {
  return <BatchesListScreen />;
}
