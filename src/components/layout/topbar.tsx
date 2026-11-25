"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Search,
  User,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Sliders,
  Settings,
} from "lucide-react";
import { brandConfig } from "@/config/brand.config";
import { BrandImage } from "@/components/shared/brand-image";
import { usePreferences } from "@/providers/preferences-provider";
import { useGatewayService } from "@/providers/demo-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandSearch } from "@/components/shared/command-search";
import { ScenarioSwitcher } from "@/components/shared/scenario-switcher";
import { useDemoScenario } from "@/providers/demo-provider";
import { PanelTopbarFrame } from "./panel-frame";
import { DashboardNotifications } from "./dashboard-notifications";

export function Topbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hideValues, toggleHideValues } = usePreferences();
  const { currentUser, logout } = useDemoScenario();
  const service = useGatewayService();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => service.getNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: () => service.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });

  return (
    <PanelTopbarFrame>
      {/* Esquerda: Identificação da Empresa & Badge de Demonstração */}
      <div className="flex items-center gap-3 min-w-0">
        <BrandImage variant="symbol" className="h-5 lg:hidden" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-base text-foreground truncate">
              {brandConfig.defaultCompany.name}
            </span>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
              {brandConfig.legalNotice}
            </span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            CNPJ: {brandConfig.defaultCompany.document}
          </span>
        </div>
      </div>

      {/* Centro/Direita: Busca Global, Privacidade, Cenários, Notificações e Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Trigger de Busca */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border/80 bg-secondary/40 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          title="Buscar transação ou navegar (Ctrl+K)"
        >
          <Search className="size-3.5 text-muted-foreground" />
          <span className="hidden md:inline">Buscar por ID, favorecido...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Ctrl+K
          </kbd>
        </button>

        {/* Alternador de Privacidade */}
        <Button
          variant="outline"
          size="iconSm"
          onClick={toggleHideValues}
          title={hideValues ? "Revelar valores monetários" : "Ocultar valores monetários"}
          className="size-9 border-border/80 text-muted-foreground hover:text-foreground"
          aria-label={hideValues ? "Revelar valores" : "Ocultar valores"}
        >
          {hideValues ? (
            <EyeOff className="size-4 text-warning" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>

        {/* Seletor de Cenários Determinísticos */}
        <div className="hidden sm:block">
          <ScenarioSwitcher />
        </div>

        <DashboardNotifications
          otherNotices={notifications}
          markingOther={markAllMutation.isPending}
          onReadOther={() => markAllMutation.mutate()}
        />

        {/* Menu do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8 cursor-pointer border border-border">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                  {currentUser?.name
                    ? currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "GS"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {currentUser?.name || "Gabriel Silva"}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {currentUser?.email || "gabriel@nexuspagamentos.com.br"}
                </p>
                <span
                  className={`mt-1 inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                    currentUser?.role === "CONSULTA"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {currentUser?.role === "CONSULTA"
                    ? "Perfil Consulta (Somente Leitura)"
                    : currentUser?.role === "TITULAR"
                    ? "Titular da Conta"
                    : currentUser?.role || "Operador"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/conta/perfil")}
              className="cursor-pointer gap-2"
            >
              <User className="size-4 text-muted-foreground" />
              <span>Perfil da Conta</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/conta/seguranca")}
              className="cursor-pointer gap-2"
            >
              <ShieldCheck className="size-4 text-muted-foreground" />
              <span>Segurança & 2FA</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/preferencias")}
              className="cursor-pointer gap-2"
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>Preferências</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/ajuda")}
              className="cursor-pointer gap-2"
            >
              <HelpCircle className="size-4 text-muted-foreground" />
              <span>Ajuda & Demonstração</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/entrar");
              }}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Sair da Demonstração</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </PanelTopbarFrame>
  );
}
