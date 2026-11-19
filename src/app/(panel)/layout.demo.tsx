"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardPixNoticesProvider } from "@/components/layout/dashboard-pix-notices";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AccountStatusGate } from "@/components/layout/account-status-gate";
import { PanelFrame } from "@/components/layout/panel-frame";
import { ScenarioSwitcher } from "@/components/shared/scenario-switcher";
import { DemoProvider, useDemoScenario, useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";

function PanelShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const service = useGatewayService();
  const { activeScenario } = useDemoScenario();
  const { data: approvals } = useQuery({
    queryKey: queryKeys.approvals("PENDING"),
    queryFn: () => service.getApprovals("PENDING"),
  });

  return (
    <AccountStatusGate>
      <DashboardPixNoticesProvider mode="demo" accountId={activeScenario}>
        <PanelFrame
          sidebar={<Sidebar demo pendingApprovals={approvals?.pendingCount} />}
          topbar={<Topbar />}
          bottomNav={<BottomNav pendingApprovals={approvals?.pendingCount} demoControls={<ScenarioSwitcher />} />}
        >
          {children}
        </PanelFrame>
      </DashboardPixNoticesProvider>
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

