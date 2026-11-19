"use client";

import React from "react";
import NextLink from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  ArrowUpRight,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
  Scale,
  LineChart,
  Percent,
  Users2,
  Lock,
  Building2,
  Sliders,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { integrationsItem } from "@/features/integrations/navigation";
import { ScenarioSwitcher } from "@/components/shared/scenario-switcher";

export default function MaisPage() {
  const sections = [
    {
      title: "Operações Pix",
      items: [
        {
          href: "/pix/receber",
          icon: QrCode,
          title: "Receber Pix",
          desc: "Gerar cobrança imediata com QR Code dinâmico",
        },
        {
          href: "/pix/saque-direto",
          icon: ArrowUpRight,
          title: "Saque Direto",
          desc: "Transferência Pix avulsa para qualquer chave",
        },
        {
          href: "/pix/saques-em-lote",
          icon: Layers,
          title: "Saques em Lote",
          desc: "Dispersão particionada em parcelas de até R$ 15k",
        },
      ],
    },
    {
      title: "Extrato & Governança",
      items: [
        {
          href: "/movimentacoes",
          icon: ArrowLeftRight,
          title: "Extrato Completo",
          desc: "Lançamentos contábeis, filtros e exportações",
        },
        {
          href: "/aprovacoes",
          icon: ShieldCheck,
          title: "Fila de Aprovações",
          desc: "Avaliação de saques e lotes que requerem alçada",
        },
        {
          href: "/conta/regras-de-aprovacao",
          icon: Scale,
          title: "Regras de Alçada",
          desc: "Configuração de limites e quóruns de aprovação",
        },
      ],
    },
    {
      title: "Métricas & Conta",
      items: [
        {
          href: "/indicadores",
          icon: LineChart,
          title: "Indicadores Pix",
          desc: "Conversão, volume transacionado e ticket médio",
        },
        {
          href: "/conta/taxas-e-limites",
          icon: Percent,
          title: "Taxas e Limites",
          desc: "Tabela tarifária e consumo do limite diário SPI",
        },
        {
          href: "/conta/perfil",
          icon: Building2,
          title: "Perfil da Empresa",
          desc: "Dados cadastrais validados junto ao Bacen",
        },
        {
          href: "/conta/usuarios",
          icon: Users2,
          title: "Gestão de Usuários",
          desc: "Colaboradores e permissões granulares",
        },
        {
          href: "/conta/seguranca",
          icon: Lock,
          title: "Segurança & 2FA",
          desc: "Autenticação em dois fatores e PIN de operações",
        },
        {
          href: integrationsItem.path,
          icon: integrationsItem.icon,
          title: integrationsItem.title,
          desc: "Chaves de API, segurança, webhooks e logs",
        },
      ],
    },
    {
      title: "Sistema & Suporte",
      items: [
        {
          href: "/preferencias",
          icon: Sliders,
          title: "Preferências & Interface",
          desc: "Densidade de tabelas e modo privacidade",
        },
        {
          href: "/ajuda",
          icon: HelpCircle,
          title: "Ajuda & FAQ",
          desc: "Perguntas frequentes e canais de suporte",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Menu Geral</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Acesso rápido a todos os módulos e ferramentas da SloPay.
        </p>
      </div>

      {/* Seletor de Cenário Móvel */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-2">
        <span className="text-xs font-semibold text-foreground block">
          Cenário Demonstrativo
        </span>
        <ScenarioSwitcher />
      </div>

      {/* Seções de Links */}
      <div className="space-y-6">
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {sec.title}
            </h2>
            <Card className="border-border bg-card/80 overflow-hidden divide-y divide-border/60">
              {sec.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <NextLink
                    key={itemIdx}
                    href={item.href}
                    className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                  </NextLink>
                );
              })}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
