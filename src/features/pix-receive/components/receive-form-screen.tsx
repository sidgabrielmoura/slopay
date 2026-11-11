"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { calculatePixFeeInCents, formatCentsToBrl } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowDownLeft, QrCode, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReceiveFormScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();

  const [amountInCents, setAmountInCents] = useState<number>(0);
  const [expirationMinutes, setExpirationMinutes] = useState<number>(60);
  const [description, setDescription] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerDocument, setPayerDocument] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const feeInCents = calculatePixFeeInCents(amountInCents, "RECEIVE");
  const netInCents = Math.max(0, amountInCents - feeInCents);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Ação bloqueada: seu perfil atual (Consulta) possui apenas permissão de leitura.");
      return;
    }

    if (amountInCents <= 0) {
      toast.error("Informe um valor maior que zero para a cobrança Pix.");
      return;
    }

    setSubmitting(true);
    try {
      const charge = await service.createCharge({
        amountInCents,
        expirationMinutes,
        description: description.trim() || undefined,
        payerName: payerName.trim() || undefined,
        payerDocument: payerDocument.trim() || undefined,
      });

      toast.success("Cobrança Pix gerada com sucesso!");
      router.push(`/pix/cobrancas/${charge.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar cobrança.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Receber com Pix
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere uma cobrança imediata com QR Code dinâmico e código Copia e Cola.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <QrCode className="size-4 text-primary" />
            <span>Dados da Cobrança</span>
          </CardTitle>
          <CardDescription className="text-xs">
            O valor recebido será liquidado no saldo da conta após a confirmação do pagamento.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Valor */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valor da Cobrança (R$) *
              </label>
              <CurrencyInput
                valueInCents={amountInCents}
                onValueChange={setAmountInCents}
                disabled={submitting}
                placeholder="R$ 0,00"
                autoFocus
              />
              {amountInCents > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
                  <span>Tarifa estimada (2,5%, mín R$ 0,15):</span>
                  <span className="font-semibold text-foreground">
                    {formatCentsToBrl(feeInCents)}
                  </span>
                </div>
              )}
            </div>

            {/* Tempo de Expiração */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tempo de Validade do QR Code
              </label>
              <ToggleGroup
                type="single"
                value={String(expirationMinutes)}
                onValueChange={(v) => v && setExpirationMinutes(Number(v))}
                className="w-full grid grid-cols-4 gap-2 bg-muted/30 p-1 rounded-lg border border-border/80"
              >
                <ToggleGroupItem value="30">30 min</ToggleGroupItem>
                <ToggleGroupItem value="60">1 hora</ToggleGroupItem>
                <ToggleGroupItem value="720">12 horas</ToggleGroupItem>
                <ToggleGroupItem value="1440">24 horas</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Descrição Opcional */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descrição ou Referência (Opcional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Fatura de serviços, Pedido #1092"
                disabled={submitting}
                maxLength={100}
              />
            </div>

            {/* Identificação do Pagador (Opcional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome do Pagador (Opcional)
                </label>
                <Input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Nome do cliente ou empresa"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CPF ou CNPJ (Opcional)
                </label>
                <Input
                  value={payerDocument}
                  onChange={(e) => setPayerDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Resumo da Cobrança */}
            {amountInCents > 0 && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Bruto:</span>
                  <span className="font-semibold text-foreground">
                    {formatCentsToBrl(amountInCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarifa Pix Estimada:</span>
                  <span className="text-muted-foreground">
                    - {formatCentsToBrl(feeInCents)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/60 text-sm font-bold">
                  <span className="text-foreground">Líquido a Receber:</span>
                  <span className="text-[var(--success)]">
                    {formatCentsToBrl(netInCents)}
                  </span>
                </div>
              </div>
            )}

            {/* Botão de Submissão */}
            <Button
              type="submit"
              disabled={submitting || amountInCents <= 0}
              className="w-full h-11 text-base font-semibold gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Gerando Cobrança...</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="size-4" />
                  <span>Gerar Cobrança Pix</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
