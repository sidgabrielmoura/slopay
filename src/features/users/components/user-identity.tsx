import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function UserIdentity({ name, email, current = false }: {
  name?: string;
  email: string;
  current?: boolean;
}) {
  const displayName = name?.trim() || "Usuário";
  const initials = (name?.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("") || email.slice(0, 2))
    .toLocaleUpperCase("pt-BR");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar aria-hidden="true"><AvatarFallback>{initials}</AvatarFallback></Avatar>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="wrap-anywhere text-sm font-medium">{displayName}</span>
          {current && <Badge variant="secondary" className="shrink-0 font-medium">Você</Badge>}
        </div>
        <p className="wrap-anywhere text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}
