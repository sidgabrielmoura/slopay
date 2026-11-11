"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import {
  calculatePixFeeInCents,
  formatCentsToBrl,
  partitionBatchInstallments,
} from "@/lib/money";
import { demoPolicy } from "@/config/demo-policy.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type KeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export function NewBatchScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();
  const queryClient = useQueryClient();
  const { hideValues } = usePreferences();

  const [step, setStep] = useState<1 | 2>(1);
  const [keyType, setKeyType] = useState<KeyType>("EMAIL");
  const [targetKey, setTargetKey] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmountInCents, setTotalAmountInCents] = useState<number>(3000000); // R$ 30k padrão
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: account } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
  });

  const availableBalance = account?.currentAvailableBalanceInCents ?? 0;

  // Particionamento dinâmico
  const installments = partitionBatchInstallments(totalAmountInCents);
  let totalFeeInCents = 0;
  const installmentsPreview = installments.map((amount, idx) => {
    const fee = calculatePixFeeInCents(amount, "WITHDRAW");
    totalFeeInCents += fee;
    return {
      index: idx + 1,
      amount,
      fee,
      total: amount + fee,
    };
  });

  const totalDebitInCents = totalAmountInCents + totalFeeInCents;

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Ação bloqueada: seu perfil atual (Consulta) possui apenas permissão de leitura.");
      return;
    }

    if (!targetKey.trim()) {
      toast.error("Informe a chave Pix de destino do lote.");
      return;
    }

    if (totalAmountInCents < demoPolicy.batchMinAmountInCents) {
      toast.error("O valor mínimo para criar um lote é de R$ 30.000,00.");
      return;
    }

    if (totalDebitInCents > availableBalance) {
      toast.error(`Saldo disponível insuficiente (${formatCentsToBrl(availableBalance)} disponível).`);
      return;
    }

    setStep(2);
  };

  const handleConfirmBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Ação bloqueada: seu perfil atual (Consulta) possui apenas permissão de leitura.");
      return;
    }

    if (pin.length < 6) {
      toast.error("Informe o PIN demonstrativo completo (123456).");
      return;
    }

    setSubmitting(true);
    try {
      const result = await service.createBatch({
        totalAmountInCents,
        targetKey: targetKey.trim(),
        targetKeyType: keyType,
        description: description.trim() || undefined,
        recipientName: recipientName.trim() || "Fornecedor Lote",
        pin: pin.trim(),
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.batches() });
      queryClient.invalidateQueries({ queryKey: queryKeys.account() });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });

      toast.success("Lote registrado com sucesso! Aguarda quórum de aprovação.");
      router.push(`/pix/saques-em-lote/${result.batch.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar lote.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (step === 2 ? setStep(1) : router.back())}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>{step === 2 ? "Voltar à Edição" : "Voltar aos Lotes"}</span>
        </Button>
        <span className="text-xs font-semibold text-muted-foreground">
          Etapa {step} de 2
        </span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {step === 1 ? "Criar Novo Saque em Lote" : "Revisão e Assinatura do Lote"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1
            ? "Configure o montante total e a chave Pix de destino para particionamento."
            : "Confira a composição das parcelas e assine com o PIN de segurança."}
        </p>
      </div>

      {step === 1 ? (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Configuração do Lote</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Mínimo de R$ 30.000,00 · Parcelas limitadas a R$ 15.000,00 cada
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleProceedToReview} className="space-y-6">
              {/* Valor Total */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor Total do Lote (R$) *
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Mínimo: R$ 30.000,00
                  </span>
                </div>
                <CurrencyInput
                  valueInCents={totalAmountInCents}
                  onValueChange={setTotalAmountInCents}
                  placeholder="R$ 30.000,00"
                />
              </div>

              {/* Chave Pix e Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de Chave
                  </label>
                  <Select
                    value={keyType}
                    onValueChange={(val) => setKeyType(val as KeyType)}
                  >
                    <SelectTrigger className="h-10 bg-card/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">E-mail</SelectItem>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="PHONE">Telefone</SelectItem>
                      <SelectItem value="RANDOM">Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Chave Pix de Destino *
                  </label>
                  <Input
                    value={targetKey}
                    onChange={(e) => setTargetKey(e.target.value)}
                    placeholder="Chave do favorecido único do lote"
                  />
                </div>
              </div>

              {/* Favorecido e Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome do Favorecido (Opcional)
                  </label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Nome da empresa ou pessoa"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Descrição do Lote (Opcional)
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Pagamento fornecedores Setembro"
                  />
                </div>
              </div>

              {/* Prévia Automática das Parcelas */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Composição Automática das Parcelas ({installmentsPreview.length})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Soma exata garantida
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {installmentsPreview.map((inst) => (
                    <div
                      key={inst.index}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60 text-xs"
                    >
                      <span className="font-medium text-foreground">
                        Parcela {inst.index} de {installmentsPreview.length}
                      </span>
                      <div className="text-right">
                        <span className="font-bold tabular-nums text-foreground">
                          {formatCentsToBrl(inst.amount, { hideValue: hideValues })}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Tarifa: {formatCentsToBrl(inst.fee, { hideValue: hideValues })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border/60 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Tarifas Totais do Lote:</span>
                  <span className="font-semibold text-muted-foreground">
                    {formatCentsToBrl(totalFeeInCents, { hideValue: hideValues })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Total Geral a Debitar:</span>
                  <span className="text-primary text-base">
                    {formatCentsToBrl(totalDebitInCents, { hideValue: hideValues })}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={totalAmountInCents < demoPolicy.batchMinAmountInCents || !targetKey.trim()}
                className="w-full h-11 text-base font-semibold"
              >
                Revisar Parcelas e Assinar
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Assinatura com PIN de Segurança
            </CardTitle>
            <CardDescription className="text-xs">
              O lote de {formatCentsToBrl(totalAmountInCents)} será registrado e encaminhado para aprovação corporativa.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleConfirmBatch} className="space-y-6">
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chave de Destino:</span>
                  <span className="font-mono text-foreground">{targetKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Número de Parcelas:</span>
                  <span className="font-semibold text-foreground">{installments.length} parcelas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total do Lote:</span>
                  <span className="font-bold text-foreground">{formatCentsToBrl(totalAmountInCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Tarifas:</span>
                  <span className="text-muted-foreground">{formatCentsToBrl(totalFeeInCents)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/40 font-bold text-foreground text-sm">
                  <span>Débito Total Previsto:</span>
                  <span className="text-primary">{formatCentsToBrl(totalDebitInCents)}</span>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  PIN Demonstrativo (123456)
                </label>
                <Input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono max-w-xs mx-auto"
                  autoFocus
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={pin.length < 6 || submitting}
                  className="flex-1 gap-2 font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Criando Lote...</span>
                    </>
                  ) : (
                    <span>Confirmar e Criar Lote</span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
