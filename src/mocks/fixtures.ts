import type {
  Account,
  User,
  Charge,
  Transaction,
  LedgerEntry,
  Batch,
  ApprovalRule,
  ApprovalRequest,
  WebhookConfig,
  Notification,
  SecurityEvent,
} from "@/types/domain";
import { demoPolicy } from "@/config/demo-policy.config";
import { brandConfig } from "@/config/brand.config";
import { calculatePixFeeInCents } from "@/lib/money";

export const initialUsers: User[] = [
  {
    id: "usr_1",
    name: "Ana Silva",
    email: "ana.silva@nexus.com.br",
    document: "•••.458.912-••",
    phone: "(11) 98765-4321",
    role: "TITULAR",
    status: "ACTIVE",
    permissions: {
      transactions: { view: true, export: true },
      pixReceive: { create: true, view: true },
      pixWithdraw: { request: true, view: true },
      approvals: { decide: true, view: true },
      rules: { manage: true, view: true },
      users: { manage: true, view: true },
      webhooks: { manage: true, view: true },
      settings: { manage: true, view: true },
    },
    lastAccessAt: "2026-09-16T09:45:00.000Z",
    createdAt: "2026-01-10T10:00:00.000Z",
  },
  {
    id: "usr_2",
    name: "Carlos Eduardo Santos",
    email: "carlos.eduardo@nexus.com.br",
    document: "•••.192.834-••",
    phone: "(11) 97654-3210",
    role: "OPERADOR",
    status: "ACTIVE",
    permissions: {
      transactions: { view: true, export: true },
      pixReceive: { create: true, view: true },
      pixWithdraw: { request: true, view: true },
      approvals: { decide: false, view: true },
      rules: { manage: false, view: true },
      users: { manage: false, view: true },
      webhooks: { manage: false, view: true },
      settings: { manage: false, view: true },
    },
    lastAccessAt: "2026-09-16T08:30:00.000Z",
    createdAt: "2026-02-15T14:20:00.000Z",
  },
  {
    id: "usr_3",
    name: "Beatriz Lima",
    email: "beatriz.lima@nexus.com.br",
    document: "•••.732.109-••",
    phone: "(11) 99123-4567",
    role: "APROVADOR",
    status: "ACTIVE",
    permissions: {
      transactions: { view: true, export: true },
      pixReceive: { create: false, view: true },
      pixWithdraw: { request: false, view: true },
      approvals: { decide: true, view: true },
      rules: { manage: false, view: true },
      users: { manage: false, view: true },
      webhooks: { manage: false, view: true },
      settings: { manage: false, view: true },
    },
    lastAccessAt: "2026-09-15T17:15:00.000Z",
    createdAt: "2026-03-01T11:00:00.000Z",
  },
  {
    id: "usr_4",
    name: "Daniela Costa",
    email: "daniela.costa@nexus.com.br",
    document: "•••.981.245-••",
    phone: "(11) 98877-6655",
    role: "APROVADOR",
    status: "ACTIVE",
    permissions: {
      transactions: { view: true, export: true },
      pixReceive: { create: false, view: true },
      pixWithdraw: { request: false, view: true },
      approvals: { decide: true, view: true },
      rules: { manage: false, view: true },
      users: { manage: false, view: true },
      webhooks: { manage: false, view: true },
      settings: { manage: false, view: true },
    },
    lastAccessAt: "2026-09-16T09:10:00.000Z",
    createdAt: "2026-03-05T09:00:00.000Z",
  },
  {
    id: "usr_5",
    name: "Marcos Rocha",
    email: "marcos.rocha@nexus.com.br",
    document: "•••.321.654-••",
    phone: "(11) 91234-5678",
    role: "CONSULTA",
    status: "ACTIVE",
    permissions: {
      transactions: { view: true, export: true },
      pixReceive: { create: false, view: true },
      pixWithdraw: { request: false, view: true },
      approvals: { decide: false, view: true },
      rules: { manage: false, view: true },
      users: { manage: false, view: true },
      webhooks: { manage: false, view: true },
      settings: { manage: false, view: false },
    },
    lastAccessAt: "2026-09-14T16:00:00.000Z",
    createdAt: "2026-04-12T15:30:00.000Z",
  },
];

export const initialAccount: Account = {
  id: "acc_demo_nexus",
  companyName: brandConfig.defaultCompany.name,
  document: brandConfig.defaultCompany.document,
  accountNumber: brandConfig.defaultCompany.accountNumber,
  bankName: brandConfig.defaultCompany.bankName,
  initialBalanceInCents: demoPolicy.initialBalanceInCents,
  currentAvailableBalanceInCents: demoPolicy.initialBalanceInCents,
  settledBalanceInCents: demoPolicy.initialBalanceInCents,
  reservedBalanceInCents: 0,
  dailyLimitInCents: demoPolicy.dailyLimitInCents,
  usedDailyLimitInCents: 0,
  maxPerTransactionInCents: demoPolicy.maxTransactionAmountInCents,
};

export const initialApprovalRules: ApprovalRule[] = [
  {
    id: "rule_1",
    name: "Operações Corporativas Acima de R$ 5k",
    minAmountInCents: demoPolicy.defaultApprovalThresholdInCents, // R$ 5.000,00
    ruleType: "PARALLEL",
    eligibleApproverIds: ["usr_1", "usr_3", "usr_4"],
    requiredApprovalsCount: 2,
    active: true,
    createdAt: "2026-03-01T10:00:00.000Z",
  },
];

export const initialWebhooks: WebhookConfig[] = [
  {
    id: "wh_1",
    eventType: "PIX_RECEIVED",
    url: "https://api.example.com/v1/webhooks/pix-recebido",
    retryEnabled: true,
    headers: [
      { key: "Authorization", value: "Bearer ••••••••••••" },
      { key: "X-Nexus-Signature", value: "sha256=••••••••" },
    ],
    active: true,
    createdAt: "2026-04-01T10:00:00.000Z",
  },
  {
    id: "wh_2",
    eventType: "PIX_SENT",
    url: "https://api.example.com/v1/webhooks/pix-saida",
    retryEnabled: true,
    headers: [{ key: "Authorization", value: "Bearer ••••••••••••" }],
    active: true,
    createdAt: "2026-04-01T10:15:00.000Z",
  },
  {
    id: "wh_3",
    eventType: "APPROVAL_REQUIRED",
    url: "https://api.example.com/v1/webhooks/aprovacao-pendente",
    retryEnabled: false,
    headers: [],
    active: true,
    createdAt: "2026-05-10T14:00:00.000Z",
  },
  {
    id: "wh_4",
    eventType: "PIX_RECEIVED",
    url: "https://erp.example.com/integracao/pix-conciliacao",
    retryEnabled: true,
    headers: [{ key: "X-Service-Key", value: "••••••••••••" }],
    active: true,
    createdAt: "2026-06-01T09:30:00.000Z",
  },
];

export const initialNotifications: Notification[] = [
  {
    id: "notif_1",
    type: "CHARGE_PAID",
    title: "Cobrança Pix Liquidada",
    message: "Recebimento de R$ 1.250,00 confirmado de Tech Solutions Ltda.",
    link: "/movimentacoes/recebimentos",
    read: false,
    createdAt: "2026-09-16T09:30:00.000Z",
  },
  {
    id: "notif_2",
    type: "APPROVAL_PENDING",
    title: "Aprovação Necessária",
    message: "Saque de R$ 7.500,00 aguarda sua decisão.",
    link: "/aprovacoes",
    read: false,
    createdAt: "2026-09-16T08:50:00.000Z",
  },
  {
    id: "notif_3",
    type: "WITHDRAWAL_COMPLETED",
    title: "Saque Concluído",
    message: "Transferência de R$ 3.800,00 enviada para Fornecedor Alpha.",
    link: "/movimentacoes/saidas",
    read: true,
    createdAt: "2026-09-15T16:20:00.000Z",
  },
  {
    id: "notif_4",
    type: "OPERATION_FAILED",
    title: "Falha em Parcela de Lote",
    message: "A parcela 3 do Lote #LOT-9821 foi rejeitada pelo PSP de destino.",
    link: "/pix/saques-em-lote/lot_2",
    read: true,
    createdAt: "2026-09-14T11:00:00.000Z",
  },
];

export const initialSecurityEvents: SecurityEvent[] = [
  {
    id: "sec_1",
    type: "PIN_CHANGE",
    description: "Alteração de PIN de confirmação na demonstração",
    simulatedIp: "187.54.12.98 (São Paulo, BR)",
    createdAt: "2026-09-10T14:30:00.000Z",
  },
  {
    id: "sec_2",
    type: "TWO_FACTOR_ENABLE",
    description: "Autenticação em dois fatores ativada na demonstração",
    simulatedIp: "187.54.12.98 (São Paulo, BR)",
    createdAt: "2026-08-20T11:15:00.000Z",
  },
];

// Gerador determinístico de transações nos últimos 6 meses (Março a Setembro de 2026)
export function generateDeterministicTransactions(): {
  transactions: Transaction[];
  charges: Charge[];
  ledgerEntries: LedgerEntry[];
  batches: Batch[];
  approvals: ApprovalRequest[];
} {
  const transactions: Transaction[] = [];
  const charges: Charge[] = [];
  const ledgerEntries: LedgerEntry[] = [];
  const batches: Batch[] = [];
  const approvals: ApprovalRequest[] = [];

  let runningBalance = demoPolicy.initialBalanceInCents;

  // 1. Cobranças de exemplo
  const sampleChargesData = [
    {
      id: "chg_today_1",
      amount: 125000, // R$ 1.250,00
      status: "PAID" as const,
      payer: "Tech Solutions Ltda",
      doc: "28.192.482/0001-90",
      created: "2026-09-16T08:00:00.000Z",
      paid: "2026-09-16T09:30:00.000Z",
    },
    {
      id: "chg_today_2",
      amount: 45000, // R$ 450,00
      status: "PENDING" as const,
      payer: "Mariana Alcantara",
      doc: "•••.382.190-••",
      created: "2026-09-16T09:15:00.000Z",
    },
    {
      id: "chg_exp_1",
      amount: 89000, // R$ 890,00
      status: "EXPIRED" as const,
      payer: "Comércio Varejista do Sul",
      doc: "19.382.102/0001-44",
      created: "2026-09-15T10:00:00.000Z",
    },
  ];

  for (const c of sampleChargesData) {
    const fee = calculatePixFeeInCents(c.amount, "RECEIVE");
    const net = c.amount - fee;
    const expiresAt = new Date(
      new Date(c.created).getTime() + 60 * 60 * 1000
    ).toISOString();

    const charge: Charge = {
      id: c.id,
      amountInCents: c.amount,
      feeInCents: fee,
      netAmountInCents: net,
      status: c.status,
      description: `Fatura de serviços digitais #${c.id.slice(-4)}`,
      payerName: c.payer,
      payerDocument: c.doc,
      qrCodeUrl: "https://example.com/pix/qr-demo",
      copyPasteCode: `00020126580014br.gov.bcb.pix0136${c.id}520400005303986540${(c.amount / 100).toFixed(2)}5802BR5915NexusPagamentos6009SaoPaulo62070503***6304DEMO`,
      createdAt: c.created,
      expiresAt,
      paidAt: c.paid,
    };
    charges.push(charge);

    if (c.status === "PAID") {
      const txId = `tx_rec_${c.id}`;
      const tx: Transaction = {
        id: txId,
        endToEndId: `E${Date.now()}20260916${txId.slice(-6)}`,
        direction: "IN",
        type: "PIX_RECEIVE",
        status: "COMPLETED",
        origin: "PANEL",
        amountInCents: c.amount,
        feeInCents: fee,
        totalDebitedInCents: net,
        counterpartyName: c.payer,
        counterpartyDocument: c.doc,
        counterpartyKey: "contato@techsolutions.com.br",
        counterpartyKeyType: "EMAIL",
        description: charge.description,
        chargeId: c.id,
        createdAt: c.created,
        settledAt: c.paid,
      };
      transactions.push(tx);

      // Ledger: Entrada do principal + débito da tarifa
      runningBalance += c.amount;
      ledgerEntries.push({
        id: `led_${txId}_cred`,
        transactionId: txId,
        date: c.paid!,
        type: "CREDIT",
        description: `Recebimento Pix - ${c.payer}`,
        amountInCents: c.amount,
        balanceAfterInCents: runningBalance,
      });

      runningBalance -= fee;
      ledgerEntries.push({
        id: `led_${txId}_fee`,
        transactionId: txId,
        date: c.paid!,
        type: "FEE_DEBIT",
        description: `Tarifa Pix Recebimento - ${c.payer}`,
        amountInCents: -fee,
        balanceAfterInCents: runningBalance,
      });
    }
  }

  // 2. Lotes de exemplo
  // Lote 1: Concluído (R$ 45.000,00 em 3 parcelas de R$ 15k)
  const lot1Date = "2026-09-12T14:00:00.000Z";
  const lot1Amount = 4500000;
  const lot1FeePerInstallment = calculatePixFeeInCents(1500000, "WITHDRAW");
  const lot1TotalFee = lot1FeePerInstallment * 3;

  const lot1: Batch = {
    id: "lot_1",
    targetKey: "financeiro@fornecedormaster.com.br",
    targetKeyType: "EMAIL",
    recipientName: "Fornecedor Master Suprimentos S.A.",
    recipientDocument: "11.222.333/0001-44",
    description: "Pagamento de insumos industriais - Lote A",
    status: "COMPLETED",
    totalAmountInCents: lot1Amount,
    totalFeeInCents: lot1TotalFee,
    totalDebitInCents: lot1Amount + lot1TotalFee,
    completedAmountInCents: lot1Amount,
    pendingAmountInCents: 0,
    failedAmountInCents: 0,
    installments: [
      {
        id: "inst_1_1",
        batchId: "lot_1",
        index: 1,
        totalInstallments: 3,
        amountInCents: 1500000,
        feeInCents: lot1FeePerInstallment,
        status: "COMPLETED",
        transactionId: "tx_inst_1_1",
        settledAt: "2026-09-12T14:01:00.000Z",
      },
      {
        id: "inst_1_2",
        batchId: "lot_1",
        index: 2,
        totalInstallments: 3,
        amountInCents: 1500000,
        feeInCents: lot1FeePerInstallment,
        status: "COMPLETED",
        transactionId: "tx_inst_1_2",
        settledAt: "2026-09-12T14:02:00.000Z",
      },
      {
        id: "inst_1_3",
        batchId: "lot_1",
        index: 3,
        totalInstallments: 3,
        amountInCents: 1500000,
        feeInCents: lot1FeePerInstallment,
        status: "COMPLETED",
        transactionId: "tx_inst_1_3",
        settledAt: "2026-09-12T14:03:00.000Z",
      },
    ],
    createdAt: lot1Date,
    completedAt: "2026-09-12T14:05:00.000Z",
  };
  batches.push(lot1);

  // Registra as transações e ledger do lote 1
  for (const inst of lot1.installments) {
    const tx: Transaction = {
      id: inst.transactionId!,
      endToEndId: `E00020260912${inst.id}`,
      direction: "OUT",
      type: "PIX_WITHDRAW",
      status: "COMPLETED",
      origin: "PANEL",
      amountInCents: inst.amountInCents,
      feeInCents: inst.feeInCents,
      totalDebitedInCents: inst.amountInCents + inst.feeInCents,
      counterpartyName: lot1.recipientName,
      counterpartyKey: lot1.targetKey,
      counterpartyKeyType: lot1.targetKeyType,
      description: `Parcela ${inst.index}/3 do Lote #LOT-1`,
      batchId: lot1.id,
      batchInstallmentIndex: inst.index,
      createdAt: lot1Date,
      settledAt: inst.settledAt,
    };
    transactions.push(tx);

    runningBalance -= inst.amountInCents + inst.feeInCents;
    ledgerEntries.push({
      id: `led_${tx.id}`,
      transactionId: tx.id,
      date: inst.settledAt!,
      type: "DEBIT",
      description: `Saque Lote Parcela ${inst.index} - ${lot1.recipientName}`,
      amountInCents: -(inst.amountInCents + inst.feeInCents),
      balanceAfterInCents: runningBalance,
    });
  }

  // Lote 2: Parcialmente Concluído (R$ 35.000,00: 15k pago, 15k pago, 5k falhou)
  const lot2Date = "2026-09-14T10:30:00.000Z";
  const lot2: Batch = {
    id: "lot_2",
    targetKey: "+5511987654321",
    targetKeyType: "PHONE",
    recipientName: "Logística Express Distribuição",
    status: "PARTIALLY_COMPLETED",
    totalAmountInCents: 3500000,
    totalFeeInCents:
      calculatePixFeeInCents(1500000, "WITHDRAW") * 2 +
      calculatePixFeeInCents(500000, "WITHDRAW"),
    totalDebitInCents: 3500000,
    completedAmountInCents: 3000000,
    pendingAmountInCents: 0,
    failedAmountInCents: 500000,
    installments: [
      {
        id: "inst_2_1",
        batchId: "lot_2",
        index: 1,
        totalInstallments: 3,
        amountInCents: 1500000,
        feeInCents: calculatePixFeeInCents(1500000, "WITHDRAW"),
        status: "COMPLETED",
        transactionId: "tx_inst_2_1",
        settledAt: "2026-09-14T10:32:00.000Z",
      },
      {
        id: "inst_2_2",
        batchId: "lot_2",
        index: 2,
        totalInstallments: 3,
        amountInCents: 1500000,
        feeInCents: calculatePixFeeInCents(1500000, "WITHDRAW"),
        status: "COMPLETED",
        transactionId: "tx_inst_2_2",
        settledAt: "2026-09-14T10:33:00.000Z",
      },
      {
        id: "inst_2_3",
        batchId: "lot_2",
        index: 3,
        totalInstallments: 3,
        amountInCents: 500000,
        feeInCents: calculatePixFeeInCents(500000, "WITHDRAW"),
        status: "FAILED",
        failureReason: "Chave Pix do favorecido temporariamente indisponível no PSP recebedor",
      },
    ],
    createdAt: lot2Date,
  };
  batches.push(lot2);

  // 3. Solicitação de Aprovação Pendente
  const approvalReq1: ApprovalRequest = {
    id: "appr_1",
    operationType: "WITHDRAWAL",
    operationId: "tx_pending_appr_1",
    amountInCents: 750000, // R$ 7.500,00 (acima do teto de R$ 5.000,00)
    feeInCents: calculatePixFeeInCents(750000, "WITHDRAW"),
    totalInCents: 750000 + calculatePixFeeInCents(750000, "WITHDRAW"),
    counterpartyName: "Global Cloud Services Inc.",
    counterpartyKey: "contas@globalcloud.com",
    requesterId: "usr_2",
    requesterName: "Carlos Eduardo Santos",
    ruleSnapshot: initialApprovalRules[0],
    requiredApprovals: 2,
    currentApprovalsCount: 1,
    decisions: [
      {
        userId: "usr_3",
        userName: "Beatriz Lima",
        decision: "APPROVE",
        reason: "Conforme fatura de infraestrutura aprovada pela diretoria.",
        decidedAt: "2026-09-16T09:10:00.000Z",
      },
    ],
    status: "PENDING",
    createdAt: "2026-09-16T08:50:00.000Z",
  };
  approvals.push(approvalReq1);

  const txPending: Transaction = {
    id: "tx_pending_appr_1",
    direction: "OUT",
    type: "PIX_WITHDRAW",
    status: "PENDING_APPROVAL",
    origin: "PANEL",
    amountInCents: approvalReq1.amountInCents,
    feeInCents: approvalReq1.feeInCents,
    totalDebitedInCents: approvalReq1.totalInCents,
    counterpartyName: approvalReq1.counterpartyName,
    counterpartyKey: approvalReq1.counterpartyKey,
    counterpartyKeyType: "EMAIL",
    description: "Pagamento mensal de servidores de nuvem",
    approvalRequestId: approvalReq1.id,
    createdAt: approvalReq1.createdAt,
  };
  transactions.push(txPending);

  // 4. Gera mais 55 transações realistas distribuídas nos 6 meses anteriores
  const counterpartiesIn = [
    { name: "Supermercado Boa Praça", doc: "04.128.990/0001-32" },
    { name: "Drogaria Vitalis Ltda", doc: "18.329.801/0001-19" },
    { name: "Marcos Vinicius Pereira", doc: "•••.482.109-••" },
    { name: "Auto Posto Bandeirantes", doc: "52.981.240/0001-78" },
    { name: "Camila Rodrigues Silva", doc: "•••.732.190-••" },
    { name: "Restaurante Sabor & Arte", doc: "33.821.091/0001-82" },
    { name: "Hospital São Lucas", doc: "44.912.834/0001-01" },
  ];

  const counterpartiesOut = [
    { name: "Distribuidora Nacional de Bebidas", key: "contato@distribuidora.com" },
    { name: "Locadora de Veículos Express", key: "+5511999887766" },
    { name: "Companhia de Energia Elétrica", key: "00.123.456/0001-00" },
    { name: "Papelaria e Escritório Central", key: "financeiro@papelariacentral.com" },
    { name: "Consultoria Jurídica Martins", key: "pix@martinsadv.com.br" },
  ];

  const monthsOffsets = [150, 120, 90, 60, 30, 10, 5, 2, 1]; // dias atrás

  let counter = 100;
  for (const daysAgo of monthsOffsets) {
    for (let i = 0; i < 6; i++) {
      counter++;
      const isReceive = i % 3 !== 0; // Mais recebimentos que saídas
      const txDate = new Date(
        new Date("2026-09-16T12:00:00.000Z").getTime() -
          daysAgo * 86400000 -
          i * 3600000
      ).toISOString();

      if (isReceive) {
        const cp = counterpartiesIn[counter % counterpartiesIn.length];
        const amount = 15000 + ((counter * 473) % 250000); // Entre R$ 150,00 e R$ 2.650,00
        const fee = calculatePixFeeInCents(amount, "RECEIVE");
        const net = amount - fee;

        const tx: Transaction = {
          id: `tx_gen_${counter}`,
          endToEndId: `E0002026${daysAgo}${counter}`,
          direction: "IN",
          type: "PIX_RECEIVE",
          status: "COMPLETED",
          origin: counter % 4 === 0 ? "API" : "PANEL",
          amountInCents: amount,
          feeInCents: fee,
          totalDebitedInCents: net,
          counterpartyName: cp.name,
          counterpartyDocument: cp.doc,
          counterpartyKey: cp.doc,
          counterpartyKeyType: "CNPJ",
          description: `Venda #${counter}`,
          createdAt: txDate,
          settledAt: txDate,
        };
        transactions.push(tx);

        runningBalance += amount - fee;
        ledgerEntries.push({
          id: `led_gen_${counter}`,
          transactionId: tx.id,
          date: txDate,
          type: "CREDIT",
          description: `Recebimento Pix - ${cp.name}`,
          amountInCents: amount,
          balanceAfterInCents: runningBalance,
        });
      } else {
        const cp = counterpartiesOut[counter % counterpartiesOut.length];
        const amount = 30000 + ((counter * 321) % 400000); // Entre R$ 300,00 e R$ 4.300,00
        const fee = calculatePixFeeInCents(amount, "WITHDRAW");

        const tx: Transaction = {
          id: `tx_gen_${counter}`,
          endToEndId: `E9992026${daysAgo}${counter}`,
          direction: "OUT",
          type: "PIX_WITHDRAW",
          status: "COMPLETED",
          origin: "PANEL",
          amountInCents: amount,
          feeInCents: fee,
          totalDebitedInCents: amount + fee,
          counterpartyName: cp.name,
          counterpartyKey: cp.key,
          counterpartyKeyType: "EMAIL",
          description: `Pagamento de fornecedor #${counter}`,
          createdAt: txDate,
          settledAt: txDate,
        };
        transactions.push(tx);

        runningBalance -= amount + fee;
        ledgerEntries.push({
          id: `led_gen_${counter}`,
          transactionId: tx.id,
          date: txDate,
          type: "DEBIT",
          description: `Saque Pix - ${cp.name}`,
          amountInCents: -(amount + fee),
          balanceAfterInCents: runningBalance,
        });
      }
    }
  }

  // Ordena decrescente por data
  transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  ledgerEntries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    transactions,
    charges,
    ledgerEntries,
    batches,
    approvals,
  };
}
