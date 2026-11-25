"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Settings, Shield } from "lucide-react";
import { PanelFrame } from "@/components/layout/panel-frame";
import { PanelPrivacyToggle } from "@/components/layout/panel-privacy";
import { PanelTopbar } from "@/components/layout/panel-topbar";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/live-auth-forms";
import type { SessionUser } from "@/lib/server/auth-backend";
import { adminPreferencesPath } from "../../admin-preferences";
import { AdminNotifications, useAdminActivity } from "../admin-activity-provider";
import { AdminBottomNav } from "./admin-bottom-nav";
import { AdminSidebar } from "./admin-sidebar";

export type AdminIdentity = Pick<SessionUser, "id" | "fullName" | "email">;

export function AdminPanel({ user, children, pendingSummary }: {
  user: AdminIdentity; children: ReactNode;
  pendingSummary?: { pendingFinancialApprovalsCount: number; totalUrgentTasks: number };
}) {
  const activity = useAdminActivity();
  const summary = activity?.summary;
  return <PanelFrame kind="admin" className="admin-panel" sidebar={<AdminSidebar live pendingSummary={summary ? {
    pendingApplicationsCount: summary.onboarding, pendingFinancialApprovalsCount: summary.ownerApproval, totalUrgentTasks: summary.total,
  } : pendingSummary} />} topbar={(
    <PanelTopbar user={user} actions={(
      <>
        <PanelPrivacyToggle className="size-11 text-muted-foreground" />
        <AdminNotifications />
        <Button asChild variant="ghost" size="icon" className="hidden size-11 text-muted-foreground sm:inline-flex">
          <Link href={adminPreferencesPath} aria-label="Preferências" prefetch={false}><Settings aria-hidden="true" /></Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="hidden size-11 text-muted-foreground sm:inline-flex">
          <Link href="/conta/seguranca" aria-label="Segurança da conta"><Shield aria-hidden="true" /></Link>
        </Button>
      </>
    )} sessionAction={<LogoutButton compact />} />
  )} bottomNav={<AdminBottomNav live />}>{children}</PanelFrame>;
}
