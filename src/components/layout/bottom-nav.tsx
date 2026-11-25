"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  ShieldCheck,
  Users2,
  GitBranch,
  ChevronRight,
  HelpCircle,
  Settings,
  ExternalLink,
} from "lucide-react";
import { integrationsItem, isIntegrationRoute } from "@/features/integrations/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { IntegrationNavigation, IntegrationsBackButton } from "./integration-navigation";

export function BottomNav({ pendingApprovals = 0, demoControls, member = false }: {
  pendingApprovals?: number;
  demoControls?: ReactNode;
  member?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pixSheetOpen, setPixSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const integrationsTrigger = useRef<HTMLButtonElement>(null);
  const integrationsBack = useRef<HTMLButtonElement>(null);
  const moveMenuFocus = useRef(false);
  const demo = Boolean(demoControls);
  const currentIntegration = !member && isIntegrationRoute(pathname);

  useLayoutEffect(() => {
    if (!moreSheetOpen || !moveMenuFocus.current) return;
    moveMenuFocus.current = false;
    (integrationsOpen ? integrationsBack : integrationsTrigger).current?.focus();
  }, [integrationsOpen, moreSheetOpen]);

  function switchMoreMenu(open: boolean) {
    moveMenuFocus.current = true;
    setIntegrationsOpen(open);
  }

  const navigateTo = (path: string) => {
    setPixSheetOpen(false);
    setMoreSheetOpen(false);
    router.push(path);
  };

  return (
    <>
      <nav aria-label="Menu do painel no celular" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-card/95 backdrop-blur-lg px-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-around">
        {/* 1. Início */}
        <NextLink
          href="/inicio"
          prefetch={demo ? undefined : false}
          aria-current={pathname === "/inicio" ? "page" : undefined}
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
          prefetch={demo ? undefined : false}
          aria-current={pathname?.startsWith("/movimentacoes") ? "page" : undefined}
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

        {!member && <>
        {/* 3. Pix Hub (Botão Central) */}
        <button
          type="button"
          aria-expanded={pixSheetOpen}
          aria-haspopup="dialog"
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
          prefetch={demo ? undefined : false}
          aria-current={pathname?.startsWith("/aprovacoes") ? "page" : undefined}
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
        </>}

        {/* 5. Mais */}
        <button
          ref={moreTrigger}
          type="button"
          aria-expanded={moreSheetOpen}
          aria-haspopup="dialog"
          onClick={() => {
            setIntegrationsOpen(currentIntegration);
            setMoreSheetOpen(true);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full text-[10px] font-medium transition-colors",
            moreSheetOpen || currentIntegration ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Menu className="size-4" />
          <span>Mais</span>
        </button>
      </nav>

      {/* Drawer: Ações Rápidas Pix */}
      {!member && <Sheet open={pixSheetOpen} onOpenChange={setPixSheetOpen}>
        <SheetContent side="bottom" aria-describedby={undefined} className="p-5 max-w-md mx-auto">
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
                <p className="text-xs text-muted-foreground">
                  {demo ? "Gerar cobrança com QR Code dinâmico" : "Disponibilidade de cobranças Pix"}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {demo ? "Transferir para qualquer chave Pix com PIN" : "Disponibilidade de saques"}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {demo ? "Particionar montantes em parcelas de até R$ 15k" : "Disponibilidade de lotes"}
                </p>
              </div>
            </button>
          </div>

          {demo && <div className="pt-2 border-t border-border">
            <button
              onClick={() => navigateTo("/pix")}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-primary hover:underline"
            >
              <span>Ver Hub e Visão Geral do Pix</span>
              <ExternalLink className="size-3.5" />
            </button>
          </div>}
        </SheetContent>
      </Sheet>}

      {/* Drawer: Mais Opções de Gestão & Conta */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent
          side="bottom"
          aria-describedby={undefined}
          className="mx-auto max-h-[85dvh] max-w-md overflow-x-hidden overflow-y-auto p-5"
          onCloseAutoFocus={(event) => { event.preventDefault(); moreTrigger.current?.focus(); }}
        >
          <SheetHeader className="flex-row items-center gap-2 space-y-0 border-b border-border pb-3 pr-8 text-left">
            {integrationsOpen && <IntegrationsBackButton ref={integrationsBack} onClick={() => switchMoreMenu(false)} />}
            <SheetTitle className="text-base font-semibold text-foreground">
              {integrationsOpen ? "Integrações" : "Menu Completo"}
            </SheetTitle>
          </SheetHeader>

          {integrationsOpen ? (
            <IntegrationNavigation className="py-3" onNavigate={() => setMoreSheetOpen(false)} />
          ) : <div className="py-2 space-y-4">
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
              {!member && <button
                onClick={() => navigateTo("/conta/taxas-e-limites")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <Percent className="size-4 text-muted-foreground" />
                <span>Taxas e Limites</span>
              </button>}
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
              {!member && demo && <button
                onClick={() => navigateTo("/conta/regras-de-aprovacao")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <GitBranch className="size-4 text-muted-foreground" />
                <span>Regras de Aprovação</span>
              </button>}
              <button
                onClick={() => navigateTo("/conta/seguranca")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <ShieldCheck className="size-4 text-muted-foreground" />
                <span>Segurança e 2FA</span>
              </button>
            </div>

            {!member && <button
              ref={integrationsTrigger}
              type="button"
              onClick={() => switchMoreMenu(true)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <integrationsItem.icon aria-hidden="true" className="size-4 text-muted-foreground" />
              {integrationsItem.title}
              <ChevronRight aria-hidden="true" className="ml-auto size-4 text-muted-foreground" />
            </button>}

            <div className="space-y-1 pt-2 border-t border-border">
              {demoControls && <div className="p-1">{demoControls}</div>}
              {!demo && (
                <button
                  onClick={() => navigateTo("/mais")}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
                >
                  <Menu className="size-4 text-muted-foreground" />
                  <span>Todos os módulos</span>
                </button>
              )}
              <button
                onClick={() => navigateTo("/ajuda")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <HelpCircle className="size-4 text-muted-foreground" />
                <span>{demo ? "Ajuda & Documentação Demo" : "Ajuda"}</span>
              </button>
              <button
                onClick={() => navigateTo("/preferencias")}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm text-foreground hover:bg-accent text-left"
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Preferências de Interface</span>
              </button>
            </div>
          </div>}
        </SheetContent>
      </Sheet>
    </>
  );
}
