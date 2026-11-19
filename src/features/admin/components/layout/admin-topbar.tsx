"use client";

import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Shield,
  LogOut,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/lib/server/auth-backend";
import { authApiService } from "@/services/auth-api.service";
import { sessionService } from "@/services/session.service";
import { toast } from "sonner";
import { useGatewayService } from "@/providers/demo-provider";
import { useQuery } from "@tanstack/react-query";
import { AdminNotifications, useAdminActivity } from "../admin-activity-provider";

export function AdminTopbar({ user }: { user?: Pick<SessionUser, "fullName" | "email"> }) {
  const router = useRouter();
  const service = useGatewayService();
  const activity = useAdminActivity();
  const [signingOut, setSigningOut] = React.useState(false);
  const session = user ? null : sessionService.getSession();
  const name = user?.fullName || session?.name || "Superadmin";
  const email = user?.email ?? session?.email ?? "admin@slopay.com.br";

  const { data: pendingSummary } = useQuery({
    queryKey: ["admin_pending_tasks_summary"],
    queryFn: () => service.getPendingTasksSummary(),
    refetchInterval: 10000,
    enabled: !activity,
  });

  const totalUrgent = pendingSummary?.totalUrgentTasks ?? 0;

  async function handleSignOut() {
    if (user) {
      if (signingOut) return;
      setSigningOut(true);
      try {
        await authApiService.logout();
        window.location.replace("/entrar");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
        setSigningOut(false);
      }
      return;
    }

    sessionService.clearSession();
    toast.success("Sessão administrativa encerrada.");
    router.push("/entrar");
  }

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Esquerda: Identificação e Status Operacional */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-primary/40 text-primary bg-primary/10 gap-1.5 px-2.5 py-0.5"
          >
            {user ? "Dados de demonstração" : "CONSOLE SUPERADMIN"}
          </Badge>
        </div>

        {!user && <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-l border-border/60 pl-4">
          <Activity className="size-3.5 text-primary" />
          <span>SPI / DICT:</span>
          <span className="text-foreground font-medium flex items-center gap-1">
            <CheckCircle2 className="size-3 text-primary" /> 100% Operacional
          </span>
        </div>}
      </div>

      {/* Direita: Alertas, Perfil e Ações Rápidas */}
      <div className="flex items-center gap-3">
        {/* Notificações / Pendências */}
        {activity ? <AdminNotifications /> : <Button
          asChild
          variant="outline"
          size="sm"
          className="relative h-9 gap-2 border-border px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <NextLink href="/admin/pendencias" aria-label="Pendências">
            <Bell aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Pendências</span>
            {totalUrgent > 0 && (
              <span className="flex items-center justify-center size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {totalUrgent}
              </span>
            )}
          </NextLink>
        </Button>}

        {/* Link direto para o Painel do Cliente */}
        {!user && <NextLink href="/inicio" className="hidden sm:inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <span>Painel Cliente</span>
            <ExternalLink className="size-3" />
          </Button>
        </NextLink>}

        {/* Dropdown de Usuário Admin */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label="Menu da conta administrativa"
              className="h-9 px-2.5 border-border bg-card hover:bg-secondary/60 text-xs flex items-center gap-2"
            >
              <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                {name.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-1">
                  Superadmin Global
                </span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground ml-1" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {name}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem asChild>
              <NextLink
                href="/admin/preferencias"
                className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
              >
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                Preferências do Console
              </NextLink>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <NextLink
                href={user ? "/conta/seguranca" : "/inicio"}
                className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
              >
                {user ? <Shield className="size-3.5 text-muted-foreground" /> : <ExternalLink className="size-3.5 text-muted-foreground" />}
                {user ? "Segurança da conta" : "Acessar Visão do Cliente"}
              </NextLink>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="size-3.5" />
              {signingOut ? "Encerrando sessão…" : "Sair da Conta"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
