export const demoPolicy = {
  currency: "BRL",
  initialBalanceInCents: 12000000, // R$ 120.000,00
  
  // Taxas
  receiveFeePercentage: 0.025, // 2.5%
  receiveFeeMinInCents: 15, // R$ 0,15
  
  withdrawFeePercentage: 0.015, // 1.5%
  withdrawFeeMinInCents: 15, // R$ 0,15
  
  // Limites
  maxTransactionAmountInCents: 1500000, // R$ 15.000,00
  dailyLimitInCents: 10000000, // R$ 100.000,00
  
  // Saques em lote
  batchMinAmountInCents: 3000000, // R$ 30.000,00
  batchMaxInstallmentInCents: 1500000, // R$ 15.000,00
  
  // Regras de aprovação
  defaultApprovalThresholdInCents: 500000, // R$ 5.000,00
  defaultRequiredApproversCount: 2,
  
  // Segurança demonstrativa
  demoPin: "123456",
  demoOtp: "123456",
  
  // Validades de cobrança padrão
  chargeExpirationsInMinutes: [30, 60, 720, 1440] as const,
  defaultChargeExpirationInMinutes: 60,
} as const;
