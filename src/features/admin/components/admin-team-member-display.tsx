import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { adminTeamStatuses, type AdminTeamEntry, type AdminTeamMember } from "../admin-team";

export function AdminMemberStatus({ status }: Pick<AdminTeamEntry, "status">) {
  const { label, variant } = adminTeamStatuses[status];
  return <Badge variant={variant} className="max-w-full whitespace-normal">{label}</Badge>;
}

const emailStates = {
  PENDING: "E-mail na fila",
  ACCEPTED: "E-mail enviado",
  FAILED: "Falha no envio do e-mail",
} as const;

export function AdminTeamEntryStatus({ entry }: { entry: AdminTeamEntry }) {
  const invite = entry.invitation;
  if (!invite) return <AdminMemberStatus status={entry.status} />;
  const date = invite.acceptedAt ?? invite.expiresAt;
  const dateLabel = invite.acceptedAt ? "Convite aceito em" : invite.status === "INVITE_EXPIRED" ? "Expirou em" : "Válido até";
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <AdminMemberStatus status={entry.status} />
      <p className="whitespace-normal">{dateLabel} <time dateTime={date}>{formatDateTime(date, "short")}</time></p>
      {entry.kind === "invitation" && invite.emailState && (
        <p className={invite.emailState === "FAILED" ? "whitespace-normal text-destructive" : "whitespace-normal"}>
          {emailStates[invite.emailState]}
        </p>
      )}
    </div>
  );
}

export function AdminMemberLogin({ lastLoginAt }: Pick<AdminTeamMember, "lastLoginAt">) {
  return lastLoginAt
    ? <time dateTime={lastLoginAt} className="tabular-nums">{formatDateTime(lastLoginAt)}</time>
    : <span className="text-muted-foreground">Sem registro</span>;
}
