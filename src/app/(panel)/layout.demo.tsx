import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AccountStatusGate } from "@/components/layout/account-status-gate";
import { DemoProvider } from "@/providers/demo-provider";

function PanelShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountStatusGate>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Sidebar Desktop */}
        <Sidebar />

        {/* Conteúdo Principal + Topbar */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Topbar />

          {/* 
            Modelo de Scroll Híbrido:
            - Desktop (lg:): container interno rola de forma independente (overflow-y-auto), mantendo topbar e sidebar travados
            - Mobile: container com rolagem fluida e padding inferior reservado para o BottomNav
          */}
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 pb-24 lg:pb-12">
            <div className="mx-auto w-full max-w-[1440px] space-y-8 animate-in fade-in-50 duration-150">
              {children}
            </div>
          </main>

          {/* Barra de Navegação Mobile Fixa */}
          <BottomNav />
        </div>
      </div>
    </AccountStatusGate>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <PanelShell>{children}</PanelShell>
    </DemoProvider>
  );
}

