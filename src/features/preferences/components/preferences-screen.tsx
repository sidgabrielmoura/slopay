"use client";

import React from "react";
import { usePreferences } from "@/providers/preferences-provider";
import { formatBrlFromCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sliders, Eye, EyeOff, LayoutTemplate, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function PreferencesScreen({ showExample = false }: { showExample?: boolean }) {
  const {
    density,
    setDensity,
    hideValues,
    toggleHideValues,
    reduceMotion,
    toggleReduceMotion,
  } = usePreferences();

  const handleDensityChange = (newDensity: "comfortable" | "compact") => {
    setDensity(newDensity);
    toast.success(
      newDensity === "compact"
        ? "Densidade compacta ativada."
        : "Densidade padrão confortável ativada."
    );
  };

  const handleTogglePrivacy = () => {
    toggleHideValues();
    toast.success(
      hideValues
        ? "Valores visíveis no painel."
        : "Modo privacidade ativo: valores monetários ocultos."
    );
  };

  const handleToggleMotion = () => {
    toggleReduceMotion();
    toast.success(
      reduceMotion
        ? "Animações restauradas."
        : "Redução de movimentos ativada."
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Preferências de Interface & Acessibilidade
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste a densidade de dados, privacidade visual e suavidade de transições do painel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-border bg-card/80 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <LayoutTemplate className="size-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                {density === "compact" ? "Compacta" : "Confortável"}
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground mt-3">
              Densidade das Tabelas e Listas
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              O modo compacto reduz o padding vertical e tamanho de fontes nas tabelas de extrato e lotes, ideal para telas menores ou visualização densa de lançamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t border-border/50 flex items-center gap-3">
            <Button
              variant={density === "comfortable" ? "default" : "outline"}
              size="sm"
              onClick={() => handleDensityChange("comfortable")}
              className="flex-1 text-xs"
            >
              Confortável (Padrão)
            </Button>
            <Button
              variant={density === "compact" ? "default" : "outline"}
              size="sm"
              onClick={() => handleDensityChange("compact")}
              className="flex-1 text-xs"
            >
              Compacta
            </Button>
          </CardContent>
        </Card>

        {/* Modo Privacidade */}
        <Card className="border-border bg-card/80 flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {hideValues ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </div>
              <Badge
                variant={hideValues ? "default" : "outline"}
                className={hideValues ? "bg-primary/20 text-primary border-primary/30" : ""}
              >
                {hideValues ? "Ativado" : "Desativado"}
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground mt-3">
              Modo Privacidade de Saldos
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Oculta cifras monetárias e saldos em todas as telas com marcadores &ldquo;••••••&rdquo;, prevenindo visualização indesejada em ambientes compartilhados.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {hideValues ? "Saldos Ocultos" : "Saldos Visíveis"}
            </span>
            <Switch checked={hideValues} onCheckedChange={handleTogglePrivacy} />
          </CardContent>
        </Card>

        {/* Redução de Movimento */}
        <Card className="border-border bg-card/80 flex flex-col justify-between md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="size-5" />
              </div>
              <Badge variant="outline" className="text-xs">
                {reduceMotion ? "Movimento Reduzido" : "Transições Suaves"}
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground mt-3">
              Sensibilidade a Movimentos & Animações
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Desativa transições dinâmicas, desvanecimentos e microanimações para pessoas com sensibilidade vestibular ou preferência por carregamento estático instantâneo.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Reduzir Animações (Prefers-Reduced-Motion)
            </span>
            <Switch checked={reduceMotion} onCheckedChange={handleToggleMotion} />
          </CardContent>
        </Card>
      </div>

      {/* Pré-visualização ao vivo */}
      {showExample && <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            Pré-visualização da Configuração Ativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-background border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">Exemplo de Saldo Disponível</span>
              <p className="text-xl font-bold font-mono tracking-tight text-foreground">
                {hideValues ? "••••••" : formatBrlFromCents(14852030)}
              </p>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <p>Densidade: <strong className="text-foreground">{density}</strong></p>
              <p>Modo Privacidade: <strong className="text-foreground">{hideValues ? "Ativo" : "Inativo"}</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
