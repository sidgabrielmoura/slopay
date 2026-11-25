"use client";

import { useQuery } from "@tanstack/react-query";
import { PanelNoticeStrip, type PanelNotice } from "@/components/layout/panel-notice-strip";
import { useGatewayService } from "@/providers/demo-provider";
import { tipNotices } from "./admin-panel-notices";
import { AdminSidebar } from "./admin-sidebar";
import { useAdminActivity } from "../admin-activity-provider";

function useDemoPendingSummary(enabled = true) {
  const service = useGatewayService();
  return useQuery({
    queryKey: ["admin_pending_tasks_summary"],
    queryFn: () => service.getPendingTasksSummary(),
    refetchInterval: 10_000,
    enabled,
  }).data;
}

export function AdminDemoNotices() {
  const summary = useDemoPendingSummary();
  const notices: PanelNotice[] = [];
  if (summary && summary.pendingApplicationsCount > 0) {
    notices.push({ id: "onboarding", message: "Há cadastros aguardando análise.", href: "/admin/abertura-de-contas" });
  }
  if (summary && summary.pendingFinancialApprovalsCount > 0) {
    notices.push({ id: "approvals", message: "Há solicitações aguardando aprovação.", href: "/admin/aprovacoes-financeiras" });
  }
  const [first, ...rest] = notices;
  return <PanelNoticeStrip entries={first ? [first, ...rest] : tipNotices} />;
}

export function AdminDemoSidebar() {
  const activity = useAdminActivity();
  const summary = useDemoPendingSummary(!activity);
  return <AdminSidebar pendingSummary={activity?.summary ? {
    totalUrgentTasks: activity.summary.total, pendingFinancialApprovalsCount: activity.summary.ownerApproval,
    pendingApplicationsCount: activity.summary.onboarding,
  } : activity ? undefined : summary} />;
}
