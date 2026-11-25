import type { ReactNode } from "react";
import { SessionMonitor } from "@/features/auth/components/session-monitor";
import type { SessionUser } from "@/lib/server/auth-backend";
import { DemoProvider } from "@/providers/demo-provider";
import { AdminBottomNav } from "./admin-bottom-nav";
import { AdminDemoSidebar } from "./admin-demo-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { AdminSectionNavigation } from "./admin-section-navigation";

export function AdminDemoShell({ children, user }: {
  children: ReactNode;
  user?: Pick<SessionUser, "fullName" | "email">;
}) {
  return (
    <DemoProvider>
      {user && <SessionMonitor />}
      <div className="min-h-dvh bg-background text-foreground flex antialiased selection:bg-primary/20 selection:text-primary">
        <AdminDemoSidebar />
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
          <AdminTopbar user={user} />
          <main className="mx-auto w-full max-w-[1500px] flex-1 space-y-6 p-4 lg:p-8">
            <AdminSectionNavigation demo />
            {children}
          </main>
        </div>
        <AdminBottomNav />
      </div>
    </DemoProvider>
  );
}
