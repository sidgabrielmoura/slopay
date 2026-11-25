import type { ReactNode } from "react";
import { BrandImage } from "@/components/shared/brand-image";
import { PanelProfileIdentity } from "./header-motion";
import { PanelTopbarFrame } from "./panel-frame";

export function PanelTopbar({ user, actions, sessionAction }: {
  user: { id: string; fullName?: string; email: string };
  actions?: ReactNode;
  sessionAction: ReactNode;
}) {
  return (
    <PanelTopbarFrame>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BrandImage variant="symbol" className="h-5 lg:hidden" />
        <PanelProfileIdentity key={user.id} profileKey={user.id} name={user.fullName} email={user.email} />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {actions && <div className="flex items-center gap-0.5 sm:gap-1">{actions}</div>}
        <div className={actions ? "ml-1 border-l border-border pl-2 sm:pl-3" : undefined}>{sessionAction}</div>
      </div>
    </PanelTopbarFrame>
  );
}
