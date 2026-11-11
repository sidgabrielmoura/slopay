import { PixHubScreen } from "@/features/pix-receive/components/pix-hub-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hub Pix",
};

export default function PixPage() {
  return <PixHubScreen />;
}
