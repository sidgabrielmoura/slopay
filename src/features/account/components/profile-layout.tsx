import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function ProfileHeading() {
  return (
    <header className="space-y-1">
      <h1 className="text-balance text-2xl font-semibold sm:text-3xl">Perfil</h1>
      <p className="text-pretty text-sm text-muted-foreground">Consulte seus dados de acesso e mantenha seu telefone atualizado.</p>
    </header>
  );
}

export function ProfileLayout({ name, email, role, active, emailVerified, securityStatus, document, contact }: {
  name?: string;
  email: string;
  role: string;
  active: boolean;
  emailVerified?: boolean;
  securityStatus?: string;
  document: ReactNode;
  contact: ReactNode;
}) {
  const fullName = name?.trim();
  const initials = (fullName
    ? fullName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")
    : email.slice(0, 2)).toLocaleUpperCase("pt-BR");

  return (
    <div className="grid min-w-0 gap-5">
      <ProfileHeading />
      <Card className="min-w-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Avatar aria-hidden="true" className="size-12 shrink-0 border-border sm:size-14">
              <AvatarFallback className="bg-accent text-base font-semibold text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-0.5">
              <h2 className="wrap-anywhere text-balance text-xl font-semibold">{fullName || "Dados de acesso"}</h2>
              <p className="text-sm text-muted-foreground">{role}</p>
            </div>
          </div>
          <Badge variant="secondary">{active ? "Conta ativa" : "Conta inativa"}</Badge>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Separator />
          <dl className="grid gap-4 pt-4 sm:grid-cols-2 sm:gap-6">
            <div className="min-w-0 space-y-1">
              <dt className="text-sm text-muted-foreground">E-mail de acesso</dt>
              <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                <span className="wrap-anywhere min-w-0">{email}</span>
                {emailVerified && <Badge variant="outline" className="text-muted-foreground">Verificado</Badge>}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">CPF</dt>
              <dd className="text-sm font-medium tabular-nums">{document ?? "Indisponível"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0">
          <CardHeader className="p-5 pb-3 sm:px-6 sm:pt-6">
            <h2 className="text-balance text-lg font-semibold">Contato</h2>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">{contact}</CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center gap-3 space-y-0 p-5 pb-3 sm:px-6 sm:pt-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <h2 className="text-balance text-lg font-semibold">Segurança</h2>
              <p className="text-pretty text-sm text-muted-foreground">{securityStatus ?? "Opções de autenticação da conta"}</p>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <Button asChild variant="outline" className="h-11">
              <Link href="/conta/seguranca" prefetch={false}>Gerenciar segurança <ArrowUpRight aria-hidden="true" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
