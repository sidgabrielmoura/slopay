"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Clock,
  ShieldCheck,
  Zap,
  BookOpen,
  ChevronDown,
  Mail,
  Phone,
  MessageSquare,
  FileText,
} from "lucide-react";

export default function AjudaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "Qual o prazo de liquidação de um Pix recebido ou enviado?",
      answer:
        "No Sistema de Pagamentos Instantâneos (SPI) do Banco Central, as liquidações ocorrem em tempo real, 24 horas por dia e 7 dias por semana, com tempo médio inferior a 3 segundos. Na SloPay, o saldo é provisionado e disponibilizado para saque imediatamente após a liquidação contábil.",
    },
    {
      question: "Como funciona a regra de alçada para saques de alto valor?",
      answer:
        "Toda solicitação de saque (ou emissão de lote) cujo montante seja igual ou superior a R$ 5.000,00 é interceptada pelo módulo de governança. Os fundos ficam temporariamente reservados no saldo da conta e o saque só é transmitido ao SPI após o quórum de aprovadores ser atingido.",
    },
    {
      question: "Por que os saques em lote são divididos em parcelas de até R$ 15.000,00?",
      answer:
        "Para cumprir políticas de conformidade e mitigar riscos sistêmicos de liquidez nas contas de liquidação do Bacen, lotes corporativos a partir de R$ 30.000,00 são particionados em parcelas atômicas sequenciais de até R$ 15.000,00 cada.",
    },
    {
      question: "O que é o Mecanismo Especial de Devolução (MED)?",
      answer:
        "O MED é uma ferramenta do Banco Central exclusiva do Pix para viabilizar a devolução de recursos em casos de fraude comprovada ou falha operacional grave. Processos de MED são auditados em até 7 dias úteis pelo departamento de compliance.",
    },
    {
      question: "Como funciona este ambiente demonstrativo?",
      answer:
        "Esta aplicação roda inteiramente no seu navegador com repositório simulado em memória (DemoRepository). O relógio operacional é ancorado deterministicamente em 16/09/2026 às 13:00 (UTC). O PIN para assinatura de transações é sempre 123456. Nenhuma operação bancária real é executada.",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Central de Ajuda & Operações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Orientações operacionais, perguntas frequentes e documentação de integração Pix.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border bg-card/80">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
              <Zap className="size-5" />
            </div>
            <CardTitle className="text-sm text-foreground">Regulamentação Bacen & SPI</CardTitle>
            <CardDescription className="text-xs">
              Diretrizes de disponibilidade, conciliação e limites noturnos do Banco Central.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle className="text-sm text-foreground">Alçadas & Governança</CardTitle>
            <CardDescription className="text-xs">
              Como configurar quóruns de aprovação paralelos e sequenciais para tesouraria.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border bg-card/80">
          <CardHeader className="pb-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
              <Clock className="size-5" />
            </div>
            <CardTitle className="text-sm text-foreground">Ambiente Demonstrativo</CardTitle>
            <CardDescription className="text-xs">
              Relógio simulado em 16/09/2026, PIN fixo 123456 e cenários em memória.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* FAQ Accordion */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            Perguntas Frequentes (FAQ)
          </CardTitle>
          <CardDescription className="text-xs">
            Respostas para as dúvidas mais comuns sobre liquidação, saques e aprovações.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 divide-y divide-border/60">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="py-3.5">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between text-left gap-4 group"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""
                      }`}
                  />
                </button>
                {isOpen && (
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2.5 pl-1">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Canais de Suporte */}
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            Canais de Atendimento Operacional
          </CardTitle>
          <CardDescription className="text-xs">
            Nossa equipe técnica e regulatória está de prontidão para suporte corporativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-background/50 border border-border/60 flex items-start gap-3">
            <Mail className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Suporte Técnico</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                suporte@slopay.com.br
              </p>
              <span className="text-[10px] text-muted-foreground block mt-1">SLA: até 15 min</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-background/50 border border-border/60 flex items-start gap-3">
            <Phone className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Mesa de Operações</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                0800 892 4040
              </p>
              <span className="text-[10px] text-muted-foreground block mt-1">24h / 7 dias</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-background/50 border border-border/60 flex items-start gap-3">
            <FileText className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Compliance & Bacen</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                compliance@slopay.com.br
              </p>
              <span className="text-[10px] text-muted-foreground block mt-1">Dias úteis 9h-18h</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
