import type { ReactNode } from "react";
import { AdminActivityProvider } from "@/features/admin/components/admin-activity-provider";
import { AdminPanel } from "@/features/admin/components/layout/admin-panel";
import { loadPanelUser } from "@/lib/server/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await loadPanelUser();
  if (user?.role !== "ADMIN") return children;

  return (
    <AdminActivityProvider accountId={user.id}>
      <AdminPanel user={{ id: user.id, fullName: user.fullName, email: user.email }}>{children}</AdminPanel>
    </AdminActivityProvider>
  );
}
