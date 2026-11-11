import type { Metadata } from "next";
import { AdminSidebar } from "@/features/admin/components/layout/admin-sidebar";
import { AdminTopbar } from "@/features/admin/components/layout/admin-topbar";
import { AdminBottomNav } from "@/features/admin/components/layout/admin-bottom-nav";
import { DemoProvider } from "@/providers/demo-provider";

export const metadata: Metadata = {
  title: "Superadmin · SloPay Pix",
  description: "Console central de governança, credenciamento e tesouraria do SloPay.",
};

function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary/20 selection:text-primary">
      {/* Sidebar Desktop Fixa */}
      <AdminSidebar />

      {/* Área Central com Topbar e Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AdminTopbar />

        <main className="flex-1 p-4 lg:p-8 max-w-[1500px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Navegação Inferior para Telas Mobile */}
      <AdminBottomNav />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <AdminShell>{children}</AdminShell>
    </DemoProvider>
  );
}
