"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { demoRepository } from "@/services/demo-repository";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  Percent,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedReport {
  id: string;
  title: string;
  category: string;
  period: string;
  generatedBy: string;
  createdAt: string;
  fileSize: string;
  format: "CSV" | "XLSX" | "JSON";
}

const INITIAL_RECENT_REPORTS: GeneratedReport[] = [
  {
    id: "rep-01",
    title: "Extrato Consolidado Multiempresa",
    category: "Financeiro",
    period: "Últimos 30 dias",
    generatedBy: "Gabriel Santos",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    fileSize: "4.2 MB",
    format: "CSV",
  },
  {
    id: "rep-02",
    title: "Demonstrativo de Receita & Tarifas SloPay",
    category: "Faturamento",
    period: "Mês Atual",
    generatedBy: "Gabriel Santos",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    fileSize: "1.8 MB",
    format: "XLSX",
  },
  {
    id: "rep-03",
    title: "Auditoria de Compliance Onboarding KYC",
    category: "Regulatório",
    period: "Últimos 90 dias",
    generatedBy: "Gabriel Santos",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    fileSize: "850 KB",
    format: "CSV",
  },
];

export default function AdminRelatoriosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("LAST_30_DAYS");
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [selectedFormat, setSelectedFormat] = useState<string>("CSV");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>(INITIAL_RECENT_REPORTS);

  const { data: companies = [] } = useQuery({
    queryKey: ["admin", "companiesList"],
    queryFn: async () => {
      const res = await demoRepository.getCompanies({ pageSize: 100 });
      return res.data;
    },
  });

  const handleGenerateReport = (title: string, category: string) => {
    setIsGenerating(true);
    toast.loading(`Compilando dados para "${title}"...`, { id: "gen-report" });

    setTimeout(() => {
      setIsGenerating(false);
      toast.dismiss("gen-report");
      toast.success(`Relatório "${title}" gerado com sucesso!`);

      const newRep: GeneratedReport = {
        id: `rep-${Date.now()}`,
        title,
        category,
        period:
          selectedPeriod === "LAST_30_DAYS"
            ? "Últimos 30 dias"
            : selectedPeriod === "THIS_MONTH"
              ? "Mês Atual"
              : "Personalizado",
        generatedBy: "Gabriel Santos (Superadmin)",
        createdAt: new Date().toISOString(),
        fileSize: "2.4 MB",
        format: selectedFormat as any,
      };

      setRecentReports([newRep, ...recentReports]);

      // Download fake trigger
      const fakeContent = `Relatorio;${title}\nData;${new Date().toISOString()}\nGeradoPor;Superadmin\n`;
      const blob = new Blob([fakeContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}.${selectedFormat.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 900);
  };

  const reportCards = [
    {
      title: "Extrato Consolidado Multiempresa",
      category: "Financeiro",
      description:
        "Todos os lançamentos a débito e a crédito de todas as contas do ecossistema com conciliação contábil.",
      icon: FileSpreadsheet,
    },
    {
      title: "Demonstrativo de Tarifas & Spread",
      category: "Faturamento",
      description:
        "Detalhamento de cada tarifa retida por operação Pix In e Pix Out, agrupada por cliente e faixa comercial.",
      icon: Percent,
    },
    {
      title: "Relatório de Liquidações do SPI",
      category: "Operações",
      description:
        "Horários de liquidação, EndToEndIDs registrados e tempos médios de resposta no Sistema de Pagamentos Instantâneos.",
      icon: Layers,
    },
    {
      title: "Relatório de Esteira KYC & Compliance",
      category: "Regulatório",
      description:
        "Histórico analítico de solicitações de abertura de conta, motivos de rejeição, prazos de análise e checklist.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Central de Relatórios & Exportações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Geração de relatórios financeiros, fiscais e regulatórios em formato consolidado ou por empresa.
          </p>
        </div>
      </div>

      {/* Global Parameters Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <span className="text-[11px] font-medium text-muted-foreground">
              Período de Extração
            </span>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger aria-label="Período de extração" className="h-9 text-xs bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="LAST_7_DAYS">Últimos 7 dias</SelectItem>
                <SelectItem value="LAST_30_DAYS">Últimos 30 dias</SelectItem>
                <SelectItem value="THIS_MONTH">Mês Vigente</SelectItem>
                <SelectItem value="LAST_MONTH">Mês Anterior</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[220px]">
            <span className="text-[11px] font-medium text-muted-foreground">
              Filtrar por Empresa
            </span>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger aria-label="Filtrar por empresa" className="h-9 text-xs bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="ALL">Todas as Empresas (Consolidado)</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.tradeName} ({c.cnpjMasked})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <span className="text-[11px] font-medium text-muted-foreground">
              Formato do Arquivo
            </span>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger aria-label="Formato do arquivo" className="h-9 text-xs bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="CSV">CSV (Planilhas / ERP)</SelectItem>
                <SelectItem value="XLSX">Excel (.XLSX)</SelectItem>
                <SelectItem value="JSON">JSON (API Payload)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map((rep, idx) => {
          const Icon = rep.icon;
          return (
            <Card
              key={idx}
              className="bg-card border-border hover:border-border/80 transition-colors"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {rep.category}
                    </Badge>
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {rep.title}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rep.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Formato: <strong className="text-foreground">{selectedFormat}</strong>
                  </span>
                  <Button
                    size="sm"
                    disabled={isGenerating}
                    onClick={() => handleGenerateReport(rep.title, rep.category)}
                    className="h-8 px-3 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Gerar e Baixar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports History */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            Histórico de Relatórios Gerados Recentemente
          </h2>
        </div>
        <div className="divide-y divide-border">
          {recentReports.map((r) => (
            <div
              key={r.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-primary" />
                  <span className="font-semibold text-foreground">{r.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.format}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Período: {r.period}</span>
                  <span>•</span>
                  <span>Gerado por: {r.generatedBy}</span>
                  <span>•</span>
                  <span>Tamanho: {r.fileSize}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success(`Download do arquivo "${r.title}.${r.format.toLowerCase()}" iniciado.`)}
                  className="h-7 px-2 text-xs border-border gap-1"
                >
                  <Download className="size-3" /> Baixar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
