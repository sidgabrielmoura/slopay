import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MerchantPanel } from "@/components/layout/merchant-panel";
import { requireSession } from "@/lib/server/session";
import type { SessionUser } from "@/lib/server/auth-backend";

export async function LiveIntegrationPage({ path, children }: { path: string; children: ReactNode | ((user: SessionUser) => ReactNode) }) {
  const user = await requireSession(path, { operations: true });
  if (user.role === "ADMIN") redirect("/admin");
  return <MerchantPanel user={user}>{typeof children === "function" ? children(user) : children}</MerchantPanel>;
}
