import type { ReactNode } from "react";
import { developmentFeaturesEnabled } from "@/config/development";
import { LogoutButton } from "@/features/auth/components/live-auth-forms";
import { SupportAccessControl } from "@/features/admin/components/support-access-control";
import type { SessionUser } from "@/lib/server/auth-backend";
import { BottomNav } from "./bottom-nav";
import { DashboardNotifications } from "./dashboard-notifications";
import { DashboardPixNoticesProvider } from "./dashboard-pix-notices";
import { MerchantPanelNotices } from "./merchant-panel-notices";
import { memberPanelTips } from "./merchant-panel-tips";
import { PanelFrame } from "./panel-frame";
import { PanelNoticeStrip, type PanelNotice } from "./panel-notice-strip";
import { PanelPrivacyToggle } from "./panel-privacy";
import { PanelTopbar } from "./panel-topbar";
import { Sidebar } from "./sidebar";

const restrictedTips = [
  { id: "account-status", message: "Acompanhe a situação da sua conta na tela inicial." },
] satisfies readonly [PanelNotice, ...PanelNotice[]];

export function MerchantPanel({
  user,
  restricted = false,
  children,
}: {
  user: SessionUser;
  restricted?: boolean;
  children: ReactNode;
}) {
  const member = user.role === "OPERATOR" || user.role === "AUDITOR";
  const notifications = !restricted &&
    (user.role === "MERCHANT" || (user.role === "OPERATOR" && user.merchantId)) && user.status === "ACTIVE" &&
    user.isEmailVerified && user.isTwoFactorEnabled && user.mfaVerified;
  const panel = (
    <PanelFrame
      kind="merchant"
      notice={notifications && user.role === "MERCHANT"
        ? <MerchantPanelNotices key={user.support?.id ?? user.id} accountId={user.id} />
        : <PanelNoticeStrip entries={restricted ? restrictedTips : memberPanelTips} />}
      sidebar={<Sidebar restricted={restricted} member={member} />}
      topbar={
        <PanelTopbar user={user} actions={!restricted && (
          <>
            <PanelPrivacyToggle className="size-11 text-muted-foreground" />
            {notifications && <DashboardNotifications />}
          </>
        )} sessionAction={user.support ? <SupportAccessControl session={user.support} /> : <LogoutButton compact />} />
      }
      bottomNav={!restricted && <BottomNav member={member} />}
    >
      {children}
    </PanelFrame>
  );
  return notifications && developmentFeaturesEnabled() ? (
    <DashboardPixNoticesProvider mode="sandbox" accountId={user.id}>{panel}</DashboardPixNoticesProvider>
  ) : panel;
}

export function PanelHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="space-y-1">
      <h1 className="text-balance text-2xl font-semibold sm:text-3xl">{title}</h1>
      {description && <p className="text-pretty text-sm text-muted-foreground">{description}</p>}
    </header>
  );
}
