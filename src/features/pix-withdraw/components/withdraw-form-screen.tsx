"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayService, useDemoScenario } from "@/providers/demo-provider";
import { usePreferences } from "@/providers/preferences-provider";
import { queryKeys } from "@/lib/query-keys";
import { calculatePixFeeInCents, formatCentsToBrl } from "@/lib/money";
import { demoPolicy } from "@/config/demo-policy.config";
import { findApplicableApprovalRule } from "@/features/approval-rules/approval-rules";
import { pixKeyInputMask } from "@/lib/validators";
import { BrazilianInput } from "@/components/ui/brazilian-input";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

type KeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export function WithdrawFormScreen() {
  const router = useRouter();
  const service = useGatewayService();
  const { isReadOnly } = useDemoScenario();
  const queryClient = useQueryClient();
  const { hideValues } = usePreferences();

  // Etapas: 1 = Preenchimento, 2 = Revisão, 3 = Confirmação PIN
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Campos
  const [keyType, setKeyType] = useState<KeyType>("EMAIL");
  const [pixKey, setPixKey] = useState("");
  const [amountInCents, setAmountInCents] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: account } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => service.getAccount(),
  });
  const rules = useQuery({
    queryKey: queryKeys.approvalRules(),
    queryFn: () => service.getApprovalRules(),
  });

  const availableBalance = account?.currentAvailableBalanceInCents ?? 0;
  const feeInCents = calculatePixFeeInCents(amountInCents, "WITHDRAW");
  const totalDebitInCents = amountInCents + feeInCents;
  const balanceRemainingInCents = availableBalance - totalDebitInCents;

  const applicableRule = rules.data && findApplicableApprovalRule(rules.data, amountInCents);

  // Validação da Etapa 1
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rules.data) {
      if (rules.isError) void rules.refetch();
      toast.info("Aguarde a consulta às regras de aprovação.");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Informe a chave Pix de destino.");
      return;
    }

    if (isReadOnly) {
      toast.error("Ação bloqueada: seu perfil atual (Consulta) possui apenas permissão de leitura.");
      return;
    }

    if (amountInCents <= 0) {
      toast.error("Informe um valor maior que zero para o saque.");
      return;
    }

    if (totalDebitInCents > availableBalance) {
      toast.error(`Saldo disponível insuficiente (${formatCentsToBrl(availableBalance)} disponível).`);
      return;
    }

    if (account && (account.usedDailyLimitInCents ?? 0) + amountInCents > account.dailyLimitInCents) {
      toast.error("O valor ultrapassa o limite diário operacional do SPI disponível para hoje.");
      return;
    }

    if (amountInCents > demoPolicy.maxTransactionAmountInCents) {
      toast.error("O valor máximo por transação única é de R$ 15.000,00.");
      return;
    }

    if (!recipientName.trim()) {
      setRecipientName("Fornecedor / Favorecido Fictício");
    }

    if (applicableRule) {
      toast.warning("Saque sujeito a aprovação", {
        id: "pix-withdraw-approval",
        description: `O valor ficará reservado até atingir o quórum da regra “${applicableRule.name}”.`,
      });
    }
    setStep(2);
  };

  // Envio final com PIN (Etapa 3)
  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      toast.error("Ação bloqueada: seu perfil atual (Consulta) possui apenas permissão de leitura.");
      return;
    }

    if (pin.length < 6) {
      toast.error("Digite o PIN demonstrativo completo (123456).");
      return;
    }

    setSubmitting(true);
    try {
      const result = await service.requestWithdrawal({
        amountInCents,
        key: pixKey.trim(),
        keyType,
        description: description.trim() || undefined,
        recipientName: recipientName.trim(),
        pin: pin.trim(),
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.account() });
      queryClient.invalidateQueries({ queryKey: queryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals() });

      if (result.requiresApproval) {
        toast.info(
          "Saque registrado e encaminhado para aprovação."
        );
        router.push(`/aprovacoes/${result.approvalRequestId}`);
      } else {
        toast.success("Saque Pix liquidado com sucesso!");
        router.push(`/movimentacoes/${result.transaction.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar saque Pix.");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Indicador de Etapas */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Saque Direto Pix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1
              ? "Etapa 1 de 3: Informe a chave e o valor do saque"
              : step === 2
                ? "Etapa 2 de 3: Revise os dados e tarifas da transferência"
                : "Etapa 3 de 3: Confirme com o PIN demonstrativo"}
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold">
          <span
            className={`size-6 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
          >
            1
          </span>
          <span className="w-4 h-0.5 bg-border" />
          <span
            className={`size-6 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
          >
            2
          </span>
          <span className="w-4 h-0.5 bg-border" />
          <span
            className={`size-6 rounded-full flex items-center justify-center ${step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
          >
            3
          </span>
        </div>
      </div>

      {/* ETAPA 1: PREENCHIMENTO */}
      {step === 1 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowUpRight className="size-4 text-primary" />
              <span>Destino e Valor</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Saldo disponível atual:{" "}
              <strong className="text-foreground">
                {formatCentsToBrl(availableBalance, { hideValue: hideValues })}
              </strong>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleProceedToReview} className="space-y-6">
              {/* Tipo de Chave e Chave Pix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de Chave
                  </label>
                  <Select
                    value={keyType}
                    onValueChange={(value) => {
                      const type = value as KeyType;
                      if (pixKeyInputMask(type) || pixKeyInputMask(keyType)) setPixKey("");
                      setKeyType(type);
                    }}
                  >
                    <SelectTrigger aria-label="Tipo de chave Pix" className="h-10 bg-card/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">E-mail</SelectItem>
                      <SelectItem value="CPF">CPF</SelectItem>
                      <SelectItem value="CNPJ">CNPJ</SelectItem>
                      <SelectItem value="PHONE">Telefone</SelectItem>
                      <SelectItem value="RANDOM">Chave Aleatória (EVP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label htmlFor="withdrawal-destination" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Chave Pix de Destino *
                  </label>
                  <BrazilianInput
                    id="withdrawal-destination"
                    mask={pixKeyInputMask(keyType)}
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={
                      keyType === "EMAIL"
                        ? "exemplo@empresa.com.br"
                        : keyType === "CPF"
                          ? "000.000.000-00"
                          : keyType === "CNPJ"
                            ? "00.000.000/0001-00"
                            : keyType === "PHONE"
                              ? "+55 (11) 98765-4321"
                              : "Cole a chave aleatória"
                    }
                    className="h-10"
                    autoFocus
                  />
                </div>
              </div>

              {/* Nome do Favorecido */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome do Favorecido / Beneficiário (Opcional)
                </label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nome do favorecido no banco de destino"
                />
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor do Saque (R$) *
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Máximo por transação: R$ 15.000,00
                  </span>
                </div>
                <CurrencyInput
                  valueInCents={amountInCents}
                  onValueChange={setAmountInCents}
                  placeholder="R$ 0,00"
                />
              </div>

              {/* Descrição Opcional */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mensagem / Descrição (Opcional)
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pagamento de serviços, Adiantamento"
                  maxLength={100}
                />
              </div>

              {/* Painel de Cálculo em Tempo Real */}
              {amountInCents > 0 && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Principal:</span>
                    <span className="font-semibold text-foreground">
                      {formatCentsToBrl(amountInCents, { hideValue: hideValues })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarifa de Saque (1,5%, mín R$ 0,15):</span>
                    <span className="text-muted-foreground">
                      + {formatCentsToBrl(feeInCents, { hideValue: hideValues })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/40">
                    <span>Total a Debitar:</span>
                    <span>{formatCentsToBrl(totalDebitInCents, { hideValue: hideValues })}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-[11px]">
                    <span className="text-muted-foreground">Saldo Restante Estimado:</span>
                    <span
                      className={`font-semibold ${balanceRemainingInCents < 0 ? "text-destructive" : "text-primary"
                        }`}
                    >
                      {formatCentsToBrl(balanceRemainingInCents, { hideValue: hideValues })}
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={amountInCents <= 0 || !pixKey.trim() || totalDebitInCents > availableBalance}
                className="w-full h-11 text-base font-semibold"
              >
                Avançar para Revisão
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 2: REVISÃO */}
      {step === 2 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revisão da Transferência Pix
            </CardTitle>
            <CardDescription className="text-xs">
              Confirme atentamente todos os dados do destinatário e os débitos calculados.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Destinatário</span>
                <span className="text-sm font-semibold text-foreground">
                  {recipientName || "Favorecido Pix"}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Chave Pix ({keyType})</span>
                <span className="text-xs font-mono text-foreground font-medium">
                  {pixKey}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Valor Principal</span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCentsToBrl(amountInCents, { hideValue: hideValues })}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Tarifa de Saque (1,5%)</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCentsToBrl(feeInCents, { hideValue: hideValues })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-foreground">Total a ser debitado</span>
                <span className="text-primary tabular-nums text-base">
                  {formatCentsToBrl(totalDebitInCents, { hideValue: hideValues })}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {applicableRule
                ? `Liquidação após ${applicableRule.requiredApprovalsCount} ${applicableRule.requiredApprovalsCount === 1 ? "aprovação" : "aprovações"}.`
                : rules.data ? "Liquidação após confirmação do PIN." : "Consultando as regras de aprovação."}
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Voltar e Editar
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 font-semibold"
              >
                Prosseguir para o PIN
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 3: CONFIRMAÇÃO COM PIN */}
      {step === 3 && (
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <div className="size-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-2">
              <KeyRound className="size-6" />
            </div>
            <CardTitle className="text-base font-semibold">
              Confirmação de Segurança
            </CardTitle>
            <CardDescription className="text-xs">
              Digite o PIN de pagamento demonstrativo de 6 dígitos para assinar a transferência.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleConfirmWithdrawal} className="space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  PIN Demonstrativo (Código: 123456)
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
                <p className="text-[11px] text-muted-foreground">
                  Para fins desta demonstração, o código é fixo em{" "}
                  <strong className="text-primary font-mono">{demoPolicy.demoPin}</strong>.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setStep(2)}
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
                      <LoadingIndicator />
                      <span>Processando Saque...</span>
                    </>
                  ) : (
                    <span>Confirmar e Transferir</span>
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
