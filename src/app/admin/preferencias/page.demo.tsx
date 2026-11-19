"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-b border-border py-2">
            <span className="min-w-0">
              <span id="admin-high-value-label" className="block text-xs font-semibold text-foreground">
                Alerta de Transações de Alto Valor
              </span>
              <span id="admin-high-value-description" className="text-[11px] text-muted-foreground">
                Notifica imediatamente quando um saque ou cobrança exceder o limite estipulado.
              </span>
            </span>
            <Checkbox
              aria-labelledby="admin-high-value-label"
              aria-describedby="admin-high-value-description"
              checked={notifyHighValue}
              onChange={(e) => setNotifyHighValue(e.target.checked)}
            />
          </label>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-b border-border py-2">
            <span className="min-w-0">
              <span id="admin-new-applications-label" className="block text-xs font-semibold text-foreground">
                Notificação de Novos Cadastros na Esteira KYC
              </span>
              <span id="admin-new-applications-description" className="text-[11px] text-muted-foreground">
                Sinaliza na fila de abertura de contas sempre que um cliente submeter onboarding.
              </span>
            </span>
            <Checkbox
              aria-labelledby="admin-new-applications-label"
              aria-describedby="admin-new-applications-description"
              checked={notifyNewApplications}
              onChange={(e) => setNotifyNewApplications(e.target.checked)}
            />
          </label>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span id="admin-security-alerts-label" className="block text-xs font-semibold text-foreground">
                Alertas de Fraude & Bloqueio Preventivo
              </span>
              <span id="admin-security-alerts-description" className="text-[11px] text-muted-foreground">
                Avisa em caso de inconsistência de IP, erro repetido de PIN ou bloqueio judicial MED.
              </span>
            </span>
            <Checkbox
              aria-labelledby="admin-security-alerts-label"
              aria-describedby="admin-security-alerts-description"
              checked={notifySecurityAlerts}
              onChange={(e) => setNotifySecurityAlerts(e.target.checked)}
            />
          </label>
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
              <label htmlFor="admin-session-timeout" className="text-xs font-medium text-foreground">
                Tempo Limite de Inatividade (Minutos)
              </label>
              <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                <SelectTrigger id="admin-session-timeout" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos (Recomendado)</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-auto-refresh-interval" className="text-xs font-medium text-foreground">
                Atualização Automática dos Feeds (Live Polling)
              </label>
              <Select value={autoRefreshInterval} onValueChange={setAutoRefreshInterval}>
                <SelectTrigger id="admin-auto-refresh-interval" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="10">A cada 10 segundos</SelectItem>
                    <SelectItem value="30">A cada 30 segundos</SelectItem>
                    <SelectItem value="60">A cada 1 minuto</SelectItem>
                    <SelectItem value="manual">Apenas manual</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
