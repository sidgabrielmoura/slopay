import type { Metadata } from "next";
import { LivePixPage } from "@/features/pix-receive/components/live-pix-page";

export const metadata: Metadata = { title: "Receber Pix" };

export default function ReceivePixPage() {
  return <LivePixPage view="receive" />;
}
