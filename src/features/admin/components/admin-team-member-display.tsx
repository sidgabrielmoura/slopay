import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { adminTeamStatuses, type AdminTeamMember } from "../admin-team";

export function AdminMemberStatus({ status }: Pick<AdminTeamMember, "status">) {
  const { label, variant } = adminTeamStatuses[status];
  return <Badge variant={variant} className="max-w-full whitespace-normal">{label}</Badge>;
}

export function AdminMemberLogin({ lastLoginAt }: Pick<AdminTeamMember, "lastLoginAt">) {
  return lastLoginAt
    ? <time dateTime={lastLoginAt} className="tabular-nums">{formatDateTime(lastLoginAt)}</time>
    : <span className="text-muted-foreground">Sem registro</span>;
}
