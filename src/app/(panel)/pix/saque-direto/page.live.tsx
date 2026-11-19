import type { Metadata } from "next";
import { LivePixPage } from "@/features/pix-receive/components/live-pix-page";

export const metadata: Metadata = { title: "Sacar Pix" };

export default function WithdrawPixPage() {
  return <LivePixPage view="withdraw" />;
}
