"use client";

import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { AdminSidebar } from "./admin-sidebar";
import { useAdminActivity } from "../admin-activity-provider";

export function AdminDemoSidebar() {
  const service = useGatewayService();
  const activity = useAdminActivity();
  const summary = useQuery({
    queryKey: ["admin_pending_tasks_summary"],
    queryFn: () => service.getPendingTasksSummary(),
    refetchInterval: 10_000,
    enabled: !activity,
  });
  return <AdminSidebar pendingSummary={activity?.summary ? {
    totalUrgentTasks: activity.summary.total, pendingFinancialApprovalsCount: activity.summary.ownerApproval,
    pendingApplicationsCount: activity.summary.onboarding,
  } : activity ? undefined : summary.data} />;
}
