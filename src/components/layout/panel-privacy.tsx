"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCentsToBrl } from "@/lib/money";
import { usePreferences } from "@/providers/preferences-provider";

export function PanelPrivacyToggle({ className }: { className?: string } = {}) {
  const { hideValues, toggleHideValues, preferencesReady, savingPreferences } = usePreferences();
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className={className}
      aria-label="Ocultar valores monetários"
      aria-pressed={hideValues}
      disabled={!preferencesReady || savingPreferences}
      onClick={toggleHideValues}
    >
      {hideValues ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  );
}

export function PanelAmount({ cents, showSign }: { cents: number | bigint; showSign?: boolean }) {
  const { hideValues, preferencesReady } = usePreferences();
  return hideValues || !preferencesReady
    ? <span aria-label="Valor oculto">••••••</span>
    : <>{formatCentsToBrl(cents, { showSign })}</>;
}
