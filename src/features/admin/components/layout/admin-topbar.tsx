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
import { sessionService } from "@/services/session.service";
import { toast } from "sonner";
import { useGatewayService } from "@/providers/demo-provider";
import { useQuery } from "@tanstack/react-query";

export function AdminTopbar() {
  const router = useRouter();
  const service = useGatewayService();
  const session = sessionService.getSession();

  const { data: pendingSummary } = useQuery({
    queryKey: ["admin_pending_tasks_summary"],
    queryFn: () => service.getPendingTasksSummary(),
    refetchInterval: 10000,
  });

  const totalUrgent = pendingSummary?.totalUrgentTasks ?? 0;

  const handleSignOut = () => {
    sessionService.clearSession();
    toast.success("Sessão administrativa encerrada.");
    router.push("/entrar");
  };

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Esquerda: Identificação e Status Operacional */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-primary/40 text-primary bg-primary/10 gap-1.5 px-2.5 py-0.5"
          >
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            CONSOLE SUPERADMIN
          </Badge>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-l border-border/60 pl-4">
          <Activity className="size-3.5 text-primary" />
          <span>SPI / DICT:</span>
          <span className="text-foreground font-medium flex items-center gap-1">
            <CheckCircle2 className="size-3 text-primary" /> 100% Operacional
          </span>
        </div>
      </div>

      {/* Direita: Alertas, Perfil e Ações Rápidas */}
      <div className="flex items-center gap-3">
        {/* Notificações / Pendências */}
        <NextLink href="/admin/pendencias">
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 px-3 border-border text-xs text-muted-foreground hover:text-foreground gap-2"
          >
            <Bell className="size-3.5" />
            <span className="hidden sm:inline">Pendências</span>
            {totalUrgent > 0 && (
              <span className="flex items-center justify-center size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {totalUrgent}
              </span>
            )}
          </Button>
        </NextLink>

        {/* Link direto para o Painel do Cliente */}
        <NextLink href="/inicio" className="hidden sm:inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <span>Painel Cliente</span>
            <ExternalLink className="size-3" />
          </Button>
        </NextLink>

        {/* Dropdown de Usuário Admin */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2.5 border-border bg-card hover:bg-secondary/60 text-xs flex items-center gap-2"
            >
              <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                A
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {session?.name || "Gabriel Santos"}
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
                  {session?.name || "Gabriel Santos"}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {session?.email || "admin@slopay.com.br"}
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
                href="/inicio"
                className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
              >
                <ExternalLink className="size-3.5 text-muted-foreground" />
                Acessar Visão do Cliente
              </NextLink>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="size-3.5" />
              Sair da Conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
