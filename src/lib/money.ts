import { demoPolicy } from "@/config/demo-policy.config";

/**
 * Formata valor em centavos inteiros para o padrão monetário BRL (R$ 1.250,00)
 */
export function formatCentsToBrl(
  amountInCents: number | bigint,
  options?: { hideValue?: boolean; showSign?: boolean }
): string {
  if (options?.hideValue) {
    return "••••••";
  }

  const isNegative = amountInCents < 0;
  let reais: number | `${number}`;
  if (typeof amountInCents === "bigint") {
    const digits = (isNegative ? -amountInCents : amountInCents).toString().padStart(3, "0");
    reais = `${digits.slice(0, -2)}.${digits.slice(-2)}` as `${number}`;
  } else {
    const absCents = Math.abs(amountInCents);
    reais = Number.isSafeInteger(absCents)
      ? (`${Math.floor(absCents / 100)}.${String(absCents % 100).padStart(2, "0")}` as `${number}`)
      : absCents / 100;
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);

  if (options?.showSign && amountInCents > 0) {
    return `+ ${formatted}`;
  }

  if (isNegative) {
    return `- ${formatted}`;
  }

  return formatted;
}

export const formatBrlFromCents = formatCentsToBrl;

/**
 * Converte string digitada (ex: "1.250,50" ou "1250.50" ou "R$ 50,00") para centavos inteiros
 */
export function parseBrlInputToCents(input: string): number {
  if (!input) return 0;
  // Remove tudo exceto dígitos
  const digitsOnly = input.replace(/\D/g, "");
  if (!digitsOnly) return 0;
  return parseInt(digitsOnly, 10);
}

/**
 * Calcula a tarifa Pix (maior valor entre o percentual arredondado em centavos e o valor mínimo fixo)
 */
export function calculatePixFeeInCents(
  amountInCents: number,
  type: "RECEIVE" | "WITHDRAW"
): number {
  if (amountInCents <= 0) return 0;

  const isReceive = type === "RECEIVE";
  const percentage = isReceive
    ? demoPolicy.receiveFeePercentage
    : demoPolicy.withdrawFeePercentage;
  const minFeeInCents = isReceive
    ? demoPolicy.receiveFeeMinInCents
    : demoPolicy.withdrawFeeMinInCents;

  const calculatedFee = Math.round(amountInCents * percentage);
  return Math.max(calculatedFee, minFeeInCents);
}

/**
 * Particiona um valor total de lote em parcelas de até `maxInstallmentInCents`
 * Garante soma estrita e exata em centavos (sem sobras ou dízimas).
 */
export function partitionBatchInstallments(
  totalAmountInCents: number,
  maxInstallmentInCents: number = demoPolicy.batchMaxInstallmentInCents
): number[] {
  if (totalAmountInCents <= 0) return [];
  if (totalAmountInCents <= maxInstallmentInCents) {
    return [totalAmountInCents];
  }

  const installments: number[] = [];
  let remaining = totalAmountInCents;

  while (remaining > 0) {
    const chunk = Math.min(remaining, maxInstallmentInCents);
    installments.push(chunk);
    remaining -= chunk;
  }

  // Verificação de integridade contábil
  const sum = installments.reduce((acc, curr) => acc + curr, 0);
  if (sum !== totalAmountInCents) {
    throw new Error(
      `Erro de partição de lote: soma (${sum}) diferente do total (${totalAmountInCents})`
    );
  }

  return installments;
}
