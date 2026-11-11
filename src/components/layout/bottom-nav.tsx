"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  CheckCircle2,
  Menu,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  BarChart3,
  Percent,
  User,
  ShieldCheck,
  Users2,
  GitBranch,
  Webhook,
  HelpCircle,
  Settings,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { useGatewayService } from "@/providers/demo-provider";
import { queryKeys } from "@/lib/query-keys";
import { ScenarioSwitcher } from "@/components/shared/scenario-switcher";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const service = useGatewayService();
  const [pixSheetOpen, setPixSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const { data: approvalsData } = useQuery({
    queryKey: queryKeys.approvals("PENDING"),
    queryFn: () => service.getApprovals("PENDING"),
  });

  const pendingApprovals = approvalsData?.pendingCount ?? 0;

  const navigateTo = (path: string) => {
    setPixSheetOpen(false);
    setMoreSheetOpen(false);
    router.push(path);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card/95 backdrop-blur-lg px-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-around">
        {/* 1. Início */}
        <NextLink
          href="/inicio"
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-medium transition-colors",
            pathname === "/inicio"
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="size-4" />
          <span>Início</span>
        </NextLink>

        {/* 2. Movimentações */}
        <NextLink
          href="/movimentacoes"
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-medium transition-colors",
            pathname?.startsWith("/movimentacoes")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ReceiptText className="size-4" />
          <span>Extrato</span>
        </NextLink>

        {/* 3. Pix Hub (Botão Central) */}
        <button
          onClick={() => setPixSheetOpen(true)}
          className="flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-medium text-foreground relative"
        >
          <div className="size-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-sm hover:bg-primary/30 transition-all">
            <span className="font-bold text-xs tracking-tighter">PIX</span>
          </div>
          <span className="text-[10px] font-semibold text-primary">Operações</span>
        </button>

        {/* 4. Aprovações */}
        <NextLink
          href="/aprovacoes"
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-medium transition-colors relative",
            pathname?.startsWith("/aprovacoes")
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <CheckCircle2 className="size-4" />
            {pendingApprovals > 0 && (
              <span className="absolute -top-1.5 -right-2 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                {pendingApprovals}
              </span>
            )}
          </div>
          <span>Aprovações</span>
        </NextLink>

        {/* 5. Mais */}
        <button
          onClick={() => setMoreSheetOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-medium transition-colors",
            moreSheetOpen ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Menu className="size-4" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Drawer: Ações Rápidas Pix */}
      <Sheet open={pixSheetOpen} onOpenChange={setPixSheetOpen}>
        <SheetContent side="bottom" className="p-5 max-w-md mx-auto">
          <SheetHeader className="text-left pb-4 border-b border-border">
            <SheetTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <span className="text-primary font-bold">PIX</span> Operações Imediatas
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-2.5 py-4">
            <button
              onClick={() => navigateTo("/pix/receber")}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card/60 hover:bg-accent transition-colors text-left group"
            >
              <div className="size-10 rounded-lg bg-[var(--success-surface)] text-[var(--success)] flex items-center justify-center shrink-0">
                <ArrowDownLeft className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">Receber com Pix</p>
                <p className="text-xs text-muted-foreground">Gerar cobrança com QR Code dinâmico</p>
              </div>
            </button>

            <button
              onClick={() => navigateTo("/pix/saque-direto")}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card/60 hover:bg-accent transition-colors text-left group"
            >
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ArrowUpRight className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">Saque Direto</p>
                <p className="text-xs text-muted-foreground">Transferir para qualquer chave Pix com PIN</p>
              </div>
            </button>

            <button
              onClick={() => navigateTo("/pix/saques-em-lote")}
              className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card/60 hover:bg-accent transition-colors text-left group"
            >
              <div className="size-10 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                <Layers className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">Saques em Lote</p>
                <p className="text-xs text-muted-foreground">Particionar montantes em parcelas de até R$ 15k</p>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={() => navigateTo("/pix")}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-primary hover:underline"
            >
              <span>Ver Hub e Visão Geral do Pix</span>
              <ExternalLink className="size-3.5" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Drawer: Mais Opções de Gestão & Conta */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="p-5 max-w-md mx-auto max-h-[85dvh] overflow-y-auto">
          <SheetHeader className="text-left pb-3 border-b border-border">
            <SheetTitle className="text-base font-semibold text-foreground">
              Menu Completo
            </SheetTitle>
          </SheetHeader>

          <div className="py-2 space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Gestão & Métricas
              </p>
              <button
                onClick={() => navigateTo("/indicadores")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <BarChart3 className="size-4 text-muted-foreground" />
                <span>Indicadores Pix</span>
              </button>
              <button
                onClick={() => navigateTo("/conta/taxas-e-limites")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <Percent className="size-4 text-muted-foreground" />
                <span>Taxas e Limites</span>
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Administração da Conta
              </p>
              <button
                onClick={() => navigateTo("/conta/usuarios")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <Users2 className="size-4 text-muted-foreground" />
                <span>Gestão de Usuários</span>
              </button>
              <button
                onClick={() => navigateTo("/conta/regras-de-aprovacao")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <GitBranch className="size-4 text-muted-foreground" />
                <span>Regras de Aprovação</span>
              </button>
              <button
                onClick={() => navigateTo("/integracoes/webhooks")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <Webhook className="size-4 text-muted-foreground" />
                <span>Configuração de Webhooks</span>
              </button>
              <button
                onClick={() => navigateTo("/conta/seguranca")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <ShieldCheck className="size-4 text-muted-foreground" />
                <span>Segurança e 2FA</span>
              </button>
            </div>

            <div className="space-y-1 pt-2 border-t border-border">
              <div className="p-1">
                <ScenarioSwitcher />
              </div>
              <button
                onClick={() => navigateTo("/ajuda")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <HelpCircle className="size-4 text-muted-foreground" />
                <span>Ajuda & Documentação Demo</span>
              </button>
              <button
                onClick={() => navigateTo("/preferencias")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Preferências de Interface</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
