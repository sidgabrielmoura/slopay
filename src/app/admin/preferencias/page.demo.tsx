"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Shield,
  Clock,
  Activity,
  Server,
  Save,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPreferenciasPage() {
  const [notifyHighValue, setNotifyHighValue] = useState(true);
  const [notifyNewApplications, setNotifyNewApplications] = useState(true);
  const [notifySecurityAlerts, setNotifySecurityAlerts] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState("30");
  const [highValueThreshold, setHighValueThreshold] = useState("50000");

  const handleSave = () => {
    toast.success("Preferências do Console Superadmin salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Preferências do Superadmin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parâmetros operacionais da mesa de controle, segurança de sessão e telemetria institucional.
        </p>
      </div>

      {/* Notificações e Alertas */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            Alertas Críticos & Notificações
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Defina quais eventos operacionais disparam alertas prioritários na barra superior e via webhook interno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Alerta de Transações de Alto Valor
              </span>
              <span className="text-[11px] text-muted-foreground">
                Notifica imediatamente quando um saque ou cobrança exceder o limite estipulado.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifyHighValue}
              onChange={(e) => setNotifyHighValue(e.target.checked)}
              className="h-4 w-4 rounded accent-primary bg-background border-border"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Notificação de Novos Cadastros na Esteira KYC
              </span>
              <span className="text-[11px] text-muted-foreground">
                Sinaliza na fila de abertura de contas sempre que um cliente submeter onboarding.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifyNewApplications}
              onChange={(e) => setNotifyNewApplications(e.target.checked)}
              className="h-4 w-4 rounded accent-primary bg-background border-border"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Alertas de Fraude & Bloqueio Preventivo
              </span>
              <span className="text-[11px] text-muted-foreground">
                Avisa em caso de inconsistência de IP, erro repetido de PIN ou bloqueio judicial MED.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notifySecurityAlerts}
              onChange={(e) => setNotifySecurityAlerts(e.target.checked)}
              className="h-4 w-4 rounded accent-primary bg-background border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessão & Atualização */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            Sessão & Frequência de Monitoramento
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Ajuste o comportamento do console operacional durante o expediente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Tempo Limite de Inatividade (Minutos)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos (Recomendado)</option>
                <option value="60">60 minutos</option>
                <option value="120">2 horas</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Atualização Automática dos Feeds (Live Polling)
              </label>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
              >
                <option value="10">A cada 10 segundos</option>
                <option value="30">A cada 30 segundos</option>
                <option value="60">A cada 1 minuto</option>
                <option value="manual">Apenas manual</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telemetria do Sistema */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Server className="size-4 text-primary" />
            Telemetria & Infraestrutura Institucional
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Indicadores de disponibilidade do motor Pix e dos canais com o Sistema de Pagamentos Instantâneos (SPI).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-background border border-border flex flex-col justify-between">
              <span className="text-muted-foreground text-[11px]">Conexão SPI / BACEN</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-emerald-400">
                <CheckCircle2 className="size-3.5" /> Operacional (24ms)
              </div>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border flex flex-col justify-between">
              <span className="text-muted-foreground text-[11px]">Disponibilidade (SLA 30d)</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-foreground">
                99.998% Uptime
              </div>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border flex flex-col justify-between">
              <span className="text-muted-foreground text-[11px]">Ambiente Ativo</span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-primary">
                Produção Primária (SP-01)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="h-9 px-4 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 gap-1.5"
        >
          <Save className="size-3.5" /> Salvar Preferências
        </Button>
      </div>
    </div>
  );
}
