import type { Metadata } from "next";
import { LivePixPage } from "@/features/pix-receive/components/live-pix-page";

export const metadata: Metadata = { title: "Pix" };

export default function PixPage() {
  return <LivePixPage view="hub" />;
}
