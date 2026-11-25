import type { ReactNode } from "react";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { loadPanelUser } from "@/lib/server/session";

export default async function MerchantLayout({ children }: { children: ReactNode }) {
  const user = await loadPanelUser(true);
  if (!user || user.role === "ADMIN") return children;
  return <MerchantPanel user={user}>{children}</MerchantPanel>;
}
