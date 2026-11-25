import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { adminTeamStatuses, type AdminTeamEntry, type AdminTeamMember } from "../admin-team";

export function AdminMemberStatus({ status }: Pick<AdminTeamEntry, "status">) {
  const { label, variant } = adminTeamStatuses[status];
  return <Badge variant={variant} className="w-fit max-w-full whitespace-normal">{label}</Badge>;
}

const emailStates = {
  PENDING: "E-mail na fila",
  ACCEPTED: "E-mail enviado",
  FAILED: "Falha no envio do e-mail",
} as const;

export function AdminTeamEntryStatus({ entry, children }: { entry: AdminTeamEntry; children?: ReactNode }) {
  const status = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <AdminMemberStatus status={entry.status} />
      {children}
    </div>
  );
  const invite = entry.invitation;
  if (!invite) return status;
  const date = invite.acceptedAt ?? invite.expiresAt;
  const dateLabel = invite.acceptedAt ? "Convite aceito em" : invite.status === "INVITE_EXPIRED" ? "Expirou em" : "Válido até";
  return (
    <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
      {status}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="whitespace-normal">
          {dateLabel} <time dateTime={date} className="whitespace-nowrap tabular-nums">{formatDateTime(date, "short")}</time>
        </p>
        {entry.kind === "invitation" && invite.emailState && (
          <p className={invite.emailState === "FAILED" ? "whitespace-normal text-destructive" : "whitespace-normal"}>
            <span aria-hidden="true" className="mr-2 text-muted-foreground">·</span>
            {emailStates[invite.emailState]}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminMemberLogin({ lastLoginAt }: Pick<AdminTeamMember, "lastLoginAt">) {
  return lastLoginAt
    ? <time dateTime={lastLoginAt} className="tabular-nums">{formatDateTime(lastLoginAt)}</time>
    : <span className="text-muted-foreground">Sem registro</span>;
}
