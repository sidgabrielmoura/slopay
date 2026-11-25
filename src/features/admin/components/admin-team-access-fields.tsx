"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { GlideSelect } from "@/components/ui/glide-select";
import { adminAccessLevel, adminAccessLevelLabels, type AdminAccessDraft } from "../admin-access";
import { adminTeam } from "../admin-team";

export function AdminTeamAccessFields({ draft, onChange, disabled }: {
  draft: AdminAccessDraft;
  onChange: (draft: AdminAccessDraft) => void;
  disabled?: boolean;
}) {
  const label = useId();
  const config = useQuery({ queryKey: ["admin-team-access-options"], queryFn: adminTeam.accessOptions, staleTime: 60_000 });
  const inherited = config.data?.defaults[draft.accessLevel] ?? [];
  const supportEntry = "admin.support.enter";
  const supportEnabled = draft.grants.includes(supportEntry);

  return (
    <div className="grid min-w-0 gap-3">
      <div className="grid gap-2">
        <span id={label} className="text-sm font-medium">Nível de acesso</span>
        <GlideSelect size="lg" value={draft.accessLevel} disabled={disabled} aria-labelledby={label}
          options={adminAccessLevel.options.map(value => ({ value, label: adminAccessLevelLabels[value] }))}
          onChange={value => {
            const accessLevel = adminAccessLevel.parse(value);
            onChange({ accessLevel, grants: accessLevel === "ADMINISTRATOR" ? [] : draft.grants });
          }} />
      </div>
      {draft.accessLevel !== "ADMINISTRATOR" && (
        <details className="rounded-lg border border-border">
          <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-medium">
            Páginas e ações extras {draft.grants.length > 0 && <span className="text-muted-foreground">({draft.grants.length})</span>}
          </summary>
          {config.isPending && <p role="status" className="px-3 pb-3 text-sm text-muted-foreground">Carregando permissões…</p>}
          {config.isError && (
            <button type="button" className="min-h-11 px-3 text-sm text-primary underline" onClick={() => void config.refetch()}>
              Tentar carregar permissões novamente
            </button>
          )}
          {config.data && (
            <div className="max-h-64 space-y-4 overflow-y-auto overscroll-contain border-t border-border p-3">
              {(["page", "action"] as const).map(kind => (
                <fieldset key={kind} className="grid gap-1" disabled={disabled}>
                  <legend className="mb-1 text-xs font-semibold text-muted-foreground">{kind === "page" ? "Páginas" : "Ações"}</legend>
                  {config.data.permissions.filter(item => item.kind === kind).map(item => {
                    const included = inherited.includes(item.key);
                    const needsSupport = !supportEnabled && item.key !== supportEntry && item.key.startsWith("admin.support.");
                    return (
                      <label key={item.key} className="flex min-h-11 items-center gap-3 text-sm">
                        <Checkbox checked={included || draft.grants.includes(item.key)} disabled={included || needsSupport || disabled}
                          onChange={event => onChange({ ...draft, grants: event.currentTarget.checked
                            ? [...draft.grants, item.key]
                            : draft.grants.filter(key => item.key === supportEntry ? !key.startsWith("admin.support.") : key !== item.key) })} />
                        <span className="min-w-0">{item.label}
                          {included && <span className="block text-xs text-muted-foreground">Incluída neste nível</span>}
                          {needsSupport && <span className="block text-xs text-muted-foreground">Requer acesso à conta do cliente</span>}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </div>
          )}
        </details>
      )}
    </div>
  );
}
