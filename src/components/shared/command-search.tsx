"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Send,
  Layers,
  CheckCircle2,
  Settings,
  Shield,
  Users,
  HelpCircle,
} from "lucide-react";
import { integrationNavigation } from "@/features/integrations/navigation";
import { useGatewayService } from "@/providers/demo-provider";
import type { Transaction } from "@/types/domain";
import { formatCentsToBrl } from "@/lib/money";

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { title: "Início / Visão Geral", path: "/inicio", icon: TrendingUp, category: "Navegação" },
  { title: "Movimentações & Extrato", path: "/movimentacoes", icon: CreditCard, category: "Navegação" },
  { title: "Receber com Pix", path: "/pix/receber", icon: ArrowRight, category: "Operações Pix" },
  { title: "Saque Direto", path: "/pix/saque-direto", icon: Send, category: "Operações Pix" },
  { title: "Saques em Lote", path: "/pix/saques-em-lote", icon: Layers, category: "Operações Pix" },
  { title: "Fila de Aprovações", path: "/aprovacoes", icon: CheckCircle2, category: "Operações Pix" },
  { title: "Indicadores Pix", path: "/indicadores", icon: TrendingUp, category: "Gestão" },
  { title: "Taxas e Limites", path: "/conta/taxas-e-limites", icon: Settings, category: "Conta & Integrações" },
  { title: "Segurança & 2FA", path: "/conta/seguranca", icon: Shield, category: "Conta & Integrações" },
  { title: "Gestão de Usuários", path: "/conta/usuarios", icon: Users, category: "Conta & Integrações" },
  { title: "Regras de Aprovação", path: "/conta/regras-de-aprovacao", icon: CheckCircle2, category: "Conta & Integrações" },
  ...integrationNavigation.map((item) => ({ ...item, category: "Integrações" })),
  { title: "Ajuda & FAQ", path: "/ajuda", icon: HelpCircle, category: "Ajuda" },
];

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const router = useRouter();
  const service = useGatewayService();
  const [query, setQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTransactions([]);
      return;
    }
    if (query.trim().length >= 2) {
      service.getTransactions({ search: query, pageSize: 5 }).then((res) => {
        setTransactions(res.data);
      });
    } else {
      setTransactions([]);
    }
  }, [query, open, service]);

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const filteredNav = navItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>Busca Rápida e Navegação</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b border-border px-3 py-2.5">
          <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para navegar ou buscar transações por ID, favorecido ou valor..."
            className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
          {/* Resultados de Transações */}
          {transactions.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transações Encontradas
              </p>
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => handleNavigate(`/movimentacoes/${tx.id}`)}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {tx.counterpartyName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.id} • {tx.type === "PIX_RECEIVE" ? "Recebimento" : "Saque"}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.direction === "IN" ? "text-[var(--success)]" : "text-foreground"
                      }`}
                    >
                      {formatCentsToBrl(tx.amountInCents, { showSign: tx.direction === "IN" })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Páginas e Atalhos */}
          <div>
            <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {query ? "Páginas Correspondentes" : "Navegação Rápida"}
            </p>
            <div className="space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors group"
                  >
                    <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>{item.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground opacity-60">
                      {item.category}
                    </span>
                  </button>
                );
              })}
              {filteredNav.length === 0 && transactions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground bg-muted/40">
          <span>Navegue com setas e selecione com Enter</span>
          <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">
            ESC para fechar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
