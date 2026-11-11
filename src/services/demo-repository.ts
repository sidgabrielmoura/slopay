import type {
  Account,
  User,
  Charge,
  Transaction,
  LedgerEntry,
  Batch,
  ApprovalRequest,
  ApprovalRule,
  WebhookConfig,
  Notification,
  SecurityEvent,
  BalanceReservation,
  AccountRegistrationStatus,
  OnboardingFormData,
  Company,
  CompanyStatus,
  AccountOperationalStatus,
  AccountApplication,
  AdminUser,
  AuditEvent,
  PricingPolicy,
  LimitPolicy,
  AdminFilterState,
  PendingTaskSummary,
} from "@/types/domain";
import type {
  IGatewayService,
  TransactionFilterParams,
  PaginatedResult,
  OverviewMetrics,
  AnalyticsMetrics,
} from "@/services/contracts";
import {
  initialAccount,
  initialUsers,
  initialApprovalRules,
  initialWebhooks,
  initialNotifications,
  initialSecurityEvents,
  generateDeterministicTransactions,
} from "@/mocks/fixtures";
import {
  INITIAL_ADMIN_USERS,
  INITIAL_COMPANIES,
  INITIAL_ACCOUNTS,
  INITIAL_APPLICATIONS,
  INITIAL_PRICING_POLICIES,
  INITIAL_LIMIT_POLICIES,
  INITIAL_AUDIT_EVENTS,
} from "@/mocks/admin-fixtures";
import { demoPolicy } from "@/config/demo-policy.config";
import { calculatePixFeeInCents, partitionBatchInstallments } from "@/lib/money";
import { demoClock } from "@/mocks/demo-clock";
import { sessionService } from "@/services/session.service";

function broadcastSync(event: string, payload?: unknown) {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel("slopay_sync");
      channel.postMessage({ event, payload, timestamp: new Date().toISOString() });
      channel.close();
    } catch {
      // Ignora erro de postMessage silenciosamente
    }
  }
}

export class DemoRepository implements IGatewayService {
  private account: Account;
  private users: User[];
  private approvalRules: ApprovalRule[];
  private webhooks: WebhookConfig[];
  private notifications: Notification[];
  private securityEvents: SecurityEvent[];
  private transactions: Transaction[];
  private charges: Charge[];
  private ledgerEntries: LedgerEntry[];
  private batches: Batch[];
  private approvals: ApprovalRequest[];
  private reservations: BalanceReservation[];
  private activeScenario: string = "NORMAL";
  private currentUser: User;
  private accountRegistrationStatus: AccountRegistrationStatus = "APPROVED";
  private onboardingSubmission?: { submittedAt: string; data: Pick<OnboardingFormData, "email"> };

  // Superadmin State
  private adminUsers: AdminUser[];
  private companies: Company[];
  private adminAccounts: Account[];
  private applications: AccountApplication[];
  private pricingPolicies: PricingPolicy[];
  private limitPolicies: LimitPolicy[];
  private auditEvents: AuditEvent[];

  constructor() {
    this.account = { ...initialAccount };
    this.users = [...initialUsers];
    this.currentUser = { ...initialUsers[0] };
    this.approvalRules = [...initialApprovalRules];
    this.webhooks = [...initialWebhooks];
    this.notifications = [...initialNotifications];
    this.securityEvents = [...initialSecurityEvents];
    this.reservations = [];

    // Initialize Superadmin State
    this.adminUsers = [...INITIAL_ADMIN_USERS];
    this.companies = [...INITIAL_COMPANIES];
    this.adminAccounts = [...INITIAL_ACCOUNTS];
    this.applications = [...INITIAL_APPLICATIONS];
    this.pricingPolicies = [...INITIAL_PRICING_POLICIES];
    this.limitPolicies = [...INITIAL_LIMIT_POLICIES];
    this.auditEvents = [...INITIAL_AUDIT_EVENTS];

    const generated = generateDeterministicTransactions();
    this.transactions = generated.transactions;
    this.charges = generated.charges;
    this.ledgerEntries = generated.ledgerEntries;
    this.batches = generated.batches;
    this.approvals = generated.approvals;

    this.recalculateBalances();
  }

  private recalculateBalances() {
    if (this.activeScenario === "NEW_ACCOUNT") {
      this.account.initialBalanceInCents = 0;
      this.account.settledBalanceInCents = 0;
      this.account.reservedBalanceInCents = 0;
      this.account.currentAvailableBalanceInCents = 0;
      this.account.usedDailyLimitInCents = 0;
      return;
    }

    if (this.activeScenario === "INSUFFICIENT_FUNDS") {
      this.account.settledBalanceInCents = 5000; // R$ 50,00
      this.account.reservedBalanceInCents = 0;
      this.account.currentAvailableBalanceInCents = 5000; // R$ 50,00
      this.account.usedDailyLimitInCents = 120000;
      return;
    }

    // Saldo contabilizado = saldo inicial + soma dos lançamentos do ledger
    let ledgerSum = 0;
    for (const entry of this.ledgerEntries) {
      ledgerSum += entry.amountInCents;
    }
    this.account.settledBalanceInCents =
      this.account.initialBalanceInCents + ledgerSum;

    // Reservas ativas
    let totalReserved = 0;
    for (const res of this.reservations) {
      if (res.status === "ACTIVE") {
        totalReserved += res.totalInCents;
      }
    }
    // Inclui saques/lotes pendentes de aprovação na reserva
    for (const app of this.approvals) {
      if (app.status === "PENDING") {
        totalReserved += app.totalInCents;
      }
    }

    this.account.reservedBalanceInCents = totalReserved;
    this.account.currentAvailableBalanceInCents = Math.max(
      0,
      this.account.settledBalanceInCents - totalReserved
    );

    if (this.activeScenario === "LIMIT_REACHED") {
      this.account.usedDailyLimitInCents = this.account.dailyLimitInCents; // R$ 100.000,00 (100% consumido)
    } else {
      // Limite diário utilizado (operações OUT de hoje)
      let usedToday = 0;
      for (const tx of this.transactions) {
        if (
          tx.direction === "OUT" &&
          (tx.status === "COMPLETED" ||
            tx.status === "PROCESSING" ||
            tx.status === "PENDING_APPROVAL")
        ) {
          usedToday += tx.amountInCents;
        }
      }
      this.account.usedDailyLimitInCents = usedToday;
    }
  }

  private async delay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- CONTA ---
  async getAccount(): Promise<Account> {
    await this.delay(50);
    this.recalculateBalances();
    return { ...this.account };
  }

  async updateProfile(phone: string): Promise<{ success: boolean; phone: string }> {
    await this.delay(120);
    const titular = this.users.find((u) => u.role === "TITULAR");
    if (titular) {
      titular.phone = phone;
    }
    return { success: true, phone };
  }

  // --- OVERVIEW & ANALYTICS ---
  async getOverviewMetrics(period?: string): Promise<OverviewMetrics> {
    await this.delay(100);
    this.recalculateBalances();

    // Filtra transações pelo período
    const now = demoClock.now().getTime();
    let minTime = 0;

    switch (period) {
      case "yesterday":
        minTime = now - 2 * 86400000;
        break;
      case "week":
        minTime = now - 7 * 86400000;
        break;
      case "month":
        minTime = now - 30 * 86400000;
        break;
      case "today":
      default:
        minTime = now - 86400000;
        break;
    }

    const filtered = this.transactions.filter(
      (t) => new Date(t.createdAt).getTime() >= minTime
    );

    let inflowsCount = 0;
    let inflowsAmountInCents = 0;
    let outflowsCount = 0;
    let outflowsAmountInCents = 0;
    let feesAmountInCents = 0;

    for (const tx of filtered) {
      feesAmountInCents += tx.feeInCents;
      if (tx.direction === "IN" && tx.status === "COMPLETED") {
        inflowsCount++;
        inflowsAmountInCents += tx.amountInCents;
      } else if (tx.direction === "OUT" && tx.status === "COMPLETED") {
        outflowsCount++;
        outflowsAmountInCents += tx.amountInCents;
      }
    }

    // Série temporal de 7 pontos para o gráfico de fluxo de caixa
    const cashflowSeries = [
      { date: "Seg", inflowsInCents: 185000, outflowsInCents: 45000 },
      { date: "Ter", inflowsInCents: 240000, outflowsInCents: 120000 },
      { date: "Qua", inflowsInCents: 310000, outflowsInCents: 85000 },
      { date: "Qui", inflowsInCents: 290000, outflowsInCents: 160000 },
      { date: "Sex", inflowsInCents: 420000, outflowsInCents: 310000 },
      { date: "Sáb", inflowsInCents: 150000, outflowsInCents: 20000 },
      { date: "Dom", inflowsInCents: 95000, outflowsInCents: 15000 },
    ];

    // Comparação de 6 meses
    const monthlyComparison = [
      { month: "Abr", inflowsInCents: 4200000, outflowsInCents: 2100000 },
      { month: "Mai", inflowsInCents: 5800000, outflowsInCents: 3200000 },
      { month: "Jun", inflowsInCents: 6400000, outflowsInCents: 4100000 },
      { month: "Jul", inflowsInCents: 7900000, outflowsInCents: 4800000 },
      { month: "Ago", inflowsInCents: 8600000, outflowsInCents: 5400000 },
      { month: "Set", inflowsInCents: 9200000, outflowsInCents: 5900000 },
    ];

    const pendingApprovalsCount = this.approvals.filter(
      (a) => a.status === "PENDING"
    ).length;

    return {
      availableBalanceInCents: this.account.currentAvailableBalanceInCents,
      settledBalanceInCents: this.account.settledBalanceInCents,
      reservedBalanceInCents: this.account.reservedBalanceInCents,
      inflowsCount,
      inflowsAmountInCents,
      outflowsCount,
      outflowsAmountInCents,
      feesAmountInCents,
      cashflowSeries,
      monthlyComparison,
      recentTransactions: this.transactions.slice(0, 6),
      pendingApprovalsCount,
    };
  }

  async getAnalytics(period?: string): Promise<AnalyticsMetrics> {
    await this.delay(100);

    const inflows = this.transactions.filter(
      (t) => t.direction === "IN" && t.status === "COMPLETED"
    );
    const outflows = this.transactions.filter(
      (t) => t.direction === "OUT" && t.status === "COMPLETED"
    );

    const inflowsVolumeInCents = inflows.reduce(
      (acc, t) => acc + t.amountInCents,
      0
    );
    const inflowsCount = inflows.length;
    const inflowsAverageTicketInCents =
      inflowsCount > 0 ? Math.round(inflowsVolumeInCents / inflowsCount) : 0;
    const inflowsMinTicketInCents =
      inflowsCount > 0 ? Math.min(...inflows.map((t) => t.amountInCents)) : 0;
    const inflowsMaxTicketInCents =
      inflowsCount > 0 ? Math.max(...inflows.map((t) => t.amountInCents)) : 0;

    const outflowsVolumeInCents = outflows.reduce(
      (acc, t) => acc + t.amountInCents,
      0
    );
    const outflowsCount = outflows.length;
    const outflowsAverageTicketInCents =
      outflowsCount > 0 ? Math.round(outflowsVolumeInCents / outflowsCount) : 0;
    const outflowsMinTicketInCents =
      outflowsCount > 0 ? Math.min(...outflows.map((t) => t.amountInCents)) : 0;
    const outflowsMaxTicketInCents =
      outflowsCount > 0 ? Math.max(...outflows.map((t) => t.amountInCents)) : 0;

    const chargesGeneratedCount = this.charges.length;
    const chargesPaidCount = this.charges.filter(
      (c) => c.status === "PAID"
    ).length;
    const conversionRate =
      chargesGeneratedCount > 0
        ? Math.round((chargesPaidCount / chargesGeneratedCount) * 1000) / 10
        : 0;

    const apiOutflows = outflows.filter((t) => t.origin === "API");
    const panelOutflows = outflows.filter((t) => t.origin === "PANEL");

    return {
      period: period ?? "today",
      inflowsVolumeInCents,
      inflowsCount,
      inflowsAverageTicketInCents,
      inflowsMinTicketInCents,
      inflowsMaxTicketInCents,
      outflowsVolumeInCents,
      outflowsCount,
      outflowsAverageTicketInCents,
      outflowsMinTicketInCents,
      outflowsMaxTicketInCents,
      conversionRate,
      chargesGeneratedCount,
      chargesPaidCount,
      outflowsByOrigin: {
        apiVolumeInCents: apiOutflows.reduce((acc, t) => acc + t.amountInCents, 0),
        apiCount: apiOutflows.length,
        panelVolumeInCents: panelOutflows.reduce(
          (acc, t) => acc + t.amountInCents,
          0
        ),
        panelCount: panelOutflows.length,
      },
      temporalSeries: [
        {
          date: "01/Set",
          inflowsAmountInCents: 1200000,
          outflowsAmountInCents: 400000,
          inflowsCount: 18,
          outflowsCount: 4,
        },
        {
          date: "05/Set",
          inflowsAmountInCents: 1850000,
          outflowsAmountInCents: 650000,
          inflowsCount: 26,
          outflowsCount: 7,
        },
        {
          date: "10/Set",
          inflowsAmountInCents: 2400000,
          outflowsAmountInCents: 900000,
          inflowsCount: 34,
          outflowsCount: 9,
        },
        {
          date: "15/Set",
          inflowsAmountInCents: 3100000,
          outflowsAmountInCents: 1250000,
          inflowsCount: 41,
          outflowsCount: 12,
        },
      ],
      monthlyComparison: [
        { month: "Abr", inflowsInCents: 4200000, outflowsInCents: 2100000 },
        { month: "Mai", inflowsInCents: 5800000, outflowsInCents: 3200000 },
        { month: "Jun", inflowsInCents: 6400000, outflowsInCents: 4100000 },
        { month: "Jul", inflowsInCents: 7900000, outflowsInCents: 4800000 },
        { month: "Ago", inflowsInCents: 8600000, outflowsInCents: 5400000 },
        { month: "Set", inflowsInCents: 9200000, outflowsInCents: 5900000 },
      ],
    };
  }

  // --- MOVIMENTAÇÕES & EXTRATO ---
  async getTransactions(
    filters?: TransactionFilterParams
  ): Promise<
    PaginatedResult<Transaction> & {
      totalInflowInCents: number;
      totalOutflowInCents: number;
      totalFeesInCents: number;
    }
  > {
    await this.delay(80);

    let result = [...this.transactions];

    if (filters?.direction) {
      result = result.filter((t) => t.direction === filters.direction);
    }
    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.endToEndId && t.endToEndId.toLowerCase().includes(q)) ||
          t.counterpartyName.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    let totalInflowInCents = 0;
    let totalOutflowInCents = 0;
    let totalFeesInCents = 0;

    for (const tx of result) {
      totalFeesInCents += tx.feeInCents;
      if (tx.direction === "IN" && tx.status === "COMPLETED") {
        totalInflowInCents += tx.amountInCents;
      } else if (tx.direction === "OUT" && tx.status === "COMPLETED") {
        totalOutflowInCents += tx.amountInCents;
      }
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = result.slice(startIndex, startIndex + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      totalInflowInCents,
      totalOutflowInCents,
      totalFeesInCents,
    };
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    await this.delay(60);
    const tx = this.transactions.find((t) => t.id === id);
    return tx ? { ...tx } : null;
  }

  async getLedgerEntries(
    filters?: TransactionFilterParams
  ): Promise<PaginatedResult<LedgerEntry>> {
    await this.delay(70);
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const total = this.ledgerEntries.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = this.ledgerEntries.slice(startIndex, startIndex + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  // --- COBRANÇAS PIX ---
  async getCharges(filters?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<Charge>> {
    await this.delay(80);
    let result = [...this.charges];

    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          (c.payerName && c.payerName.toLowerCase().includes(q))
      );
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = result.slice(startIndex, startIndex + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getChargeById(id: string): Promise<Charge | null> {
    await this.delay(50);
    const c = this.charges.find((item) => item.id === id);
    return c ? { ...c } : null;
  }

  async createCharge(params: {
    amountInCents: number;
    expirationMinutes: number;
    description?: string;
    payerName?: string;
    payerDocument?: string;
  }): Promise<Charge> {
    await this.delay(150);

    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) não possui permissão para gerar cobranças.");
    }
    const feeInCents = calculatePixFeeInCents(params.amountInCents, "RECEIVE");
    const netAmountInCents = params.amountInCents - feeInCents;
    const id = `chg_${Date.now().toString(36)}`;
    const nowIso = demoClock.now().toISOString();
    const expiresAt = new Date(
      demoClock.now().getTime() + params.expirationMinutes * 60 * 1000
    ).toISOString();

    const charge: Charge = {
      id,
      amountInCents: params.amountInCents,
      feeInCents,
      netAmountInCents,
      status: "PENDING",
      description: params.description,
      payerName: params.payerName,
      payerDocument: params.payerDocument,
      qrCodeUrl: "https://example.com/pix/qr-demo",
      copyPasteCode: `00020126580014br.gov.bcb.pix0136${id}520400005303986540${(params.amountInCents / 100).toFixed(2)}5802BR5915NexusPagamentos6009SaoPaulo62070503***6304DEMO`,
      createdAt: nowIso,
      expiresAt,
    };

    this.charges.unshift(charge);
    return charge;
  }

  async simulatePayCharge(chargeId: string): Promise<Charge> {
    await this.delay(180);
    const charge = this.charges.find((c) => c.id === chargeId);
    if (!charge) {
      throw new Error("Cobrança não encontrada");
    }

    if (charge.status === "PAID") {
      return charge;
    }

    const paidAt = demoClock.now().toISOString();
    charge.status = "PAID";
    charge.paidAt = paidAt;

    // Gera a transação de entrada
    const txId = `tx_rec_${charge.id}`;
    const tx: Transaction = {
      id: txId,
      endToEndId: `E${Date.now()}20260916${txId.slice(-6)}`,
      direction: "IN",
      type: "PIX_RECEIVE",
      status: "COMPLETED",
      origin: "PANEL",
      amountInCents: charge.amountInCents,
      feeInCents: charge.feeInCents,
      totalDebitedInCents: charge.netAmountInCents,
      counterpartyName: charge.payerName || "Pagador Anônimo",
      counterpartyDocument: charge.payerDocument,
      description: charge.description || `Recebimento Pix Cobrança #${charge.id}`,
      chargeId: charge.id,
      createdAt: charge.createdAt,
      settledAt: paidAt,
    };
    this.transactions.unshift(tx);

    // Gera lançamentos no ledger
    this.recalculateBalances();
    const balanceAfterCredit =
      this.account.settledBalanceInCents + charge.amountInCents;
    this.ledgerEntries.unshift({
      id: `led_${txId}_cred`,
      transactionId: txId,
      date: paidAt,
      type: "CREDIT",
      description: `Recebimento Pix Cobrança #${charge.id}`,
      amountInCents: charge.amountInCents,
      balanceAfterInCents: balanceAfterCredit,
    });

    this.ledgerEntries.unshift({
      id: `led_${txId}_fee`,
      transactionId: txId,
      date: paidAt,
      type: "FEE_DEBIT",
      description: `Tarifa Pix Recebimento #${charge.id}`,
      amountInCents: -charge.feeInCents,
      balanceAfterInCents: balanceAfterCredit - charge.feeInCents,
    });

    // Notificação
    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: "CHARGE_PAID",
      title: "Cobrança Pix Liquidada",
      message: `Recebimento de ${(charge.amountInCents / 100).toLocaleString(
        "pt-BR",
        { style: "currency", currency: "BRL" }
      )} confirmado.`,
      link: `/movimentacoes/${txId}`,
      read: false,
      createdAt: paidAt,
    });

    this.recalculateBalances();
    return charge;
  }

  // --- SAQUE DIRETO ---
  async requestWithdrawal(params: {
    amountInCents: number;
    key: string;
    keyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";
    description?: string;
    recipientName?: string;
    recipientDocument?: string;
    pin: string;
  }): Promise<{
    transaction: Transaction;
    requiresApproval: boolean;
    approvalRequestId?: string;
  }> {
    await this.delay(200);

    if (params.pin !== demoPolicy.demoPin) {
      throw new Error("PIN de confirmação incorreto. Use o PIN demonstrativo 123456.");
    }

    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }

    if (this.activeScenario === "LIMIT_REACHED") {
      throw new Error(
        "Operação bloqueada: o limite diário operacional do Pix (R$ 100.000,00) já foi 100% atingido hoje."
      );
    }

    const feeInCents = calculatePixFeeInCents(params.amountInCents, "WITHDRAW");
    const totalRequiredInCents = params.amountInCents + feeInCents;

    this.recalculateBalances();
    if (totalRequiredInCents > this.account.currentAvailableBalanceInCents) {
      const availFormatted = (this.account.currentAvailableBalanceInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      throw new Error(`Saldo disponível insuficiente. Seu saldo atual é de ${availFormatted}.`);
    }

    if (
      this.account.usedDailyLimitInCents + params.amountInCents >
      this.account.dailyLimitInCents
    ) {
      throw new Error(
        "O valor ultrapassa o limite diário operacional disponível para hoje."
      );
    }

    const txId = `tx_wd_${Date.now().toString(36)}`;
    const nowIso = demoClock.now().toISOString();

    // Verifica regras de aprovação (a partir de R$ 5.000,00)
    const applicableRule = this.approvalRules.find(
      (r) => r.active && params.amountInCents >= r.minAmountInCents
    );

    if (applicableRule) {
      const approvalId = `appr_${Date.now().toString(36)}`;
      const approvalReq: ApprovalRequest = {
        id: approvalId,
        operationType: "WITHDRAWAL",
        operationId: txId,
        amountInCents: params.amountInCents,
        feeInCents,
        totalInCents: totalRequiredInCents,
        counterpartyName: params.recipientName || "Favorecido Pix",
        counterpartyKey: params.key,
        requesterId: "usr_1",
        requesterName: "Ana Silva",
        ruleSnapshot: applicableRule,
        requiredApprovals: applicableRule.requiredApprovalsCount,
        currentApprovalsCount: 0,
        decisions: [],
        status: "PENDING",
        createdAt: nowIso,
      };
      this.approvals.unshift(approvalReq);

      const tx: Transaction = {
        id: txId,
        direction: "OUT",
        type: "PIX_WITHDRAW",
        status: "PENDING_APPROVAL",
        origin: "PANEL",
        amountInCents: params.amountInCents,
        feeInCents,
        totalDebitedInCents: totalRequiredInCents,
        counterpartyName: params.recipientName || "Favorecido Pix",
        counterpartyKey: params.key,
        counterpartyKeyType: params.keyType,
        description: params.description,
        approvalRequestId: approvalId,
        createdAt: nowIso,
      };
      this.transactions.unshift(tx);

      // Reserva de saldo
      this.reservations.push({
        id: `res_${txId}`,
        requestId: txId,
        principalInCents: params.amountInCents,
        feeInCents,
        totalInCents: totalRequiredInCents,
        status: "ACTIVE",
        createdAt: nowIso,
      });

      this.recalculateBalances();
      return { transaction: tx, requiresApproval: true, approvalRequestId: approvalId };
    }

    // Saque direto aprovado imediatamente (< R$ 5k)
    const tx: Transaction = {
      id: txId,
      endToEndId: `E00020260916${txId}`,
      direction: "OUT",
      type: "PIX_WITHDRAW",
      status: "COMPLETED",
      origin: "PANEL",
      amountInCents: params.amountInCents,
      feeInCents,
      totalDebitedInCents: totalRequiredInCents,
      counterpartyName: params.recipientName || "Favorecido Pix",
      counterpartyKey: params.key,
      counterpartyKeyType: params.keyType,
      description: params.description,
      createdAt: nowIso,
      settledAt: nowIso,
    };
    this.transactions.unshift(tx);

    // Ledger
    this.ledgerEntries.unshift({
      id: `led_${txId}_deb`,
      transactionId: txId,
      date: nowIso,
      type: "DEBIT",
      description: `Saque Pix para ${tx.counterpartyName}`,
      amountInCents: -totalRequiredInCents,
      balanceAfterInCents:
        this.account.settledBalanceInCents - totalRequiredInCents,
    });

    this.recalculateBalances();
    return { transaction: tx, requiresApproval: false };
  }

  // --- SAQUES EM LOTE ---
  async getBatches(filters?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<Batch>> {
    await this.delay(80);
    let result = [...this.batches];
    if (filters?.status) {
      result = result.filter((b) => b.status === filters.status);
    }
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = result.slice(startIndex, startIndex + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getBatchById(id: string): Promise<Batch | null> {
    await this.delay(60);
    const b = this.batches.find((item) => item.id === id);
    return b ? { ...b } : null;
  }

  async createBatch(params: {
    totalAmountInCents: number;
    targetKey: string;
    targetKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";
    description?: string;
    recipientName?: string;
    pin: string;
  }): Promise<{ batch: Batch; requiresApproval: boolean; approvalRequestId?: string }> {
    await this.delay(200);

    if (params.pin !== demoPolicy.demoPin) {
      throw new Error("PIN incorreto. Use 123456.");
    }

    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }

    if (this.activeScenario === "LIMIT_REACHED") {
      throw new Error("Operação bloqueada: o limite diário operacional do Pix já foi 100% atingido hoje.");
    }

    if (params.totalAmountInCents < demoPolicy.batchMinAmountInCents) {
      throw new Error("O valor mínimo para saques em lote é de R$ 30.000,00.");
    }

    const partitions = partitionBatchInstallments(params.totalAmountInCents);
    let totalFee = 0;
    const installments = partitions.map((partAmount, idx) => {
      const fee = calculatePixFeeInCents(partAmount, "WITHDRAW");
      totalFee += fee;
      return {
        id: `inst_${Date.now()}_${idx + 1}`,
        batchId: "",
        index: idx + 1,
        totalInstallments: partitions.length,
        amountInCents: partAmount,
        feeInCents: fee,
        status: "PENDING_APPROVAL" as const,
      };
    });

    const totalDebit = params.totalAmountInCents + totalFee;
    this.recalculateBalances();
    if (totalDebit > this.account.currentAvailableBalanceInCents) {
      throw new Error("Saldo insuficiente para cobrir o total do lote e as tarifas.");
    }

    const batchId = `lot_${Date.now().toString(36)}`;
    const nowIso = demoClock.now().toISOString();
    installments.forEach((inst) => (inst.batchId = batchId));

    const batch: Batch = {
      id: batchId,
      targetKey: params.targetKey,
      targetKeyType: params.targetKeyType,
      recipientName: params.recipientName || "Beneficiário Lote",
      description: params.description,
      status: "PENDING_APPROVAL",
      totalAmountInCents: params.totalAmountInCents,
      totalFeeInCents: totalFee,
      totalDebitInCents: totalDebit,
      completedAmountInCents: 0,
      pendingAmountInCents: params.totalAmountInCents,
      failedAmountInCents: 0,
      installments,
      createdAt: nowIso,
    };

    // Cria requisição de aprovação (lotes sempre ultrapassam R$ 5k)
    const rule = this.approvalRules[0];
    const approvalId = `appr_${batchId}`;
    const approvalReq: ApprovalRequest = {
      id: approvalId,
      operationType: "BATCH",
      operationId: batchId,
      amountInCents: params.totalAmountInCents,
      feeInCents: totalFee,
      totalInCents: totalDebit,
      counterpartyName: batch.recipientName,
      counterpartyKey: batch.targetKey,
      requesterId: "usr_1",
      requesterName: "Ana Silva",
      ruleSnapshot: rule,
      requiredApprovals: rule.requiredApprovalsCount,
      currentApprovalsCount: 0,
      decisions: [],
      status: "PENDING",
      createdAt: nowIso,
    };
    this.approvals.unshift(approvalReq);
    batch.approvalRequestId = approvalId;

    this.batches.unshift(batch);
    this.recalculateBalances();

    return { batch, requiresApproval: true, approvalRequestId: approvalId };
  }

  // --- APROVAÇÕES ---
  async getApprovals(status?: "PENDING" | "APPROVED" | "REJECTED"): Promise<{
    data: ApprovalRequest[];
    total: number;
    pendingCount: number;
  }> {
    await this.delay(70);
    const pendingCount = this.approvals.filter(
      (a) => a.status === "PENDING"
    ).length;
    let data = [...this.approvals];
    if (status) {
      data = data.filter((a) => a.status === status);
    }
    return { data, total: data.length, pendingCount };
  }

  async getApprovalById(id: string): Promise<ApprovalRequest | null> {
    await this.delay(50);
    const a = this.approvals.find((item) => item.id === id);
    return a ? { ...a } : null;
  }

  async decideApproval(params: {
    requestId: string;
    decision: "APPROVE" | "REJECT";
    reason?: string;
  }): Promise<ApprovalRequest> {
    await this.delay(180);

    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) não possui alçada para decidir aprovações.");
    }

    const req = this.approvals.find((a) => a.id === params.requestId);
    if (!req) {
      throw new Error("Solicitação de aprovação não encontrada");
    }

    if (req.status !== "PENDING") {
      throw new Error("Esta solicitação já foi concluída anteriormente.");
    }

    // Registra decisão (usando usuário autenticado da demo: Beatriz Lima - usr_3 ou Daniela - usr_4)
    const decider = this.users.find((u) => u.id === "usr_3")!;
    req.decisions.push({
      userId: decider.id,
      userName: decider.name,
      decision: params.decision,
      reason: params.reason,
      decidedAt: demoClock.now().toISOString(),
    });

    if (params.decision === "REJECT") {
      req.status = "REJECTED";
      req.resolvedAt = demoClock.now().toISOString();

      // Libera reserva
      const res = this.reservations.find((r) => r.requestId === req.operationId);
      if (res) res.status = "CANCELLED";

      // Atualiza transação
      const tx = this.transactions.find((t) => t.id === req.operationId);
      if (tx) {
        tx.status = "REJECTED";
        tx.failureReason = params.reason || "Rejeitado pelo aprovador";
      }

      this.recalculateBalances();
      return req;
    }

    // Se aprovado, incrementa contador
    req.currentApprovalsCount = req.decisions.filter(
      (d) => d.decision === "APPROVE"
    ).length;

    if (req.currentApprovalsCount >= req.requiredApprovals) {
      req.status = "APPROVED";
      req.resolvedAt = demoClock.now().toISOString();

      // Se for saque direto, liquida transação
      if (req.operationType === "WITHDRAWAL") {
        const tx = this.transactions.find((t) => t.id === req.operationId);
        if (tx) {
          tx.status = "COMPLETED";
          tx.settledAt = req.resolvedAt;
          tx.endToEndId = `E00020260916${tx.id}`;

          // Baixa reserva e debita no ledger
          const res = this.reservations.find(
            (r) => r.requestId === req.operationId
          );
          if (res) res.status = "SETTLED";

          this.ledgerEntries.unshift({
            id: `led_${tx.id}_deb`,
            transactionId: tx.id,
            date: req.resolvedAt,
            type: "DEBIT",
            description: `Saque Pix para ${tx.counterpartyName}`,
            amountInCents: -tx.totalDebitedInCents,
            balanceAfterInCents:
              this.account.settledBalanceInCents - tx.totalDebitedInCents,
          });
        }
      } else if (req.operationType === "BATCH") {
        const batch = this.batches.find((b) => b.id === req.operationId);
        if (batch) {
          batch.status = "COMPLETED";
          batch.completedAmountInCents = batch.totalAmountInCents;
          batch.pendingAmountInCents = 0;
          batch.completedAt = req.resolvedAt;

          for (const inst of batch.installments) {
            inst.status = "COMPLETED";
            inst.settledAt = req.resolvedAt;
            inst.transactionId = `tx_${inst.id}`;

            const tx: Transaction = {
              id: inst.transactionId,
              endToEndId: `E00020260916${inst.id}`,
              direction: "OUT",
              type: "PIX_WITHDRAW",
              status: "COMPLETED",
              origin: "PANEL",
              amountInCents: inst.amountInCents,
              feeInCents: inst.feeInCents,
              totalDebitedInCents: inst.amountInCents + inst.feeInCents,
              counterpartyName: batch.recipientName,
              counterpartyKey: batch.targetKey,
              counterpartyKeyType: batch.targetKeyType,
              description: `Parcela ${inst.index} do Lote #${batch.id}`,
              batchId: batch.id,
              batchInstallmentIndex: inst.index,
              createdAt: batch.createdAt,
              settledAt: req.resolvedAt,
            };
            this.transactions.unshift(tx);

            this.ledgerEntries.unshift({
              id: `led_${tx.id}`,
              transactionId: tx.id,
              date: req.resolvedAt,
              type: "DEBIT",
              description: `Saque Lote Parcela ${inst.index} - ${batch.recipientName}`,
              amountInCents: -(inst.amountInCents + inst.feeInCents),
              balanceAfterInCents:
                this.account.settledBalanceInCents -
                (inst.amountInCents + inst.feeInCents),
            });
          }
        }
      }
    }

    this.recalculateBalances();
    return req;
  }

  // --- REGRAS DE APROVAÇÃO ---
  async getApprovalRules(): Promise<ApprovalRule[]> {
    await this.delay(50);
    return [...this.approvalRules];
  }

  async createApprovalRule(
    rule: Omit<ApprovalRule, "id" | "createdAt">
  ): Promise<ApprovalRule> {
    await this.delay(120);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const newRule: ApprovalRule = {
      ...rule,
      id: `rule_${Date.now().toString(36)}`,
      createdAt: demoClock.now().toISOString(),
    };
    this.approvalRules.push(newRule);
    return newRule;
  }

  async updateApprovalRule(
    id: string,
    ruleUpdate: Partial<ApprovalRule>
  ): Promise<ApprovalRule> {
    await this.delay(100);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const rule = this.approvalRules.find((r) => r.id === id);
    if (!rule) throw new Error("Regra não encontrada");
    Object.assign(rule, ruleUpdate);
    return { ...rule };
  }

  async deleteApprovalRule(id: string): Promise<boolean> {
    await this.delay(90);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    this.approvalRules = this.approvalRules.filter((r) => r.id !== id);
    return true;
  }

  // --- USUÁRIOS ---
  async getUsers(filters?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<User>> {
    await this.delay(60);
    let result = [...this.users];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.document.includes(q)
      );
    }
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = result.slice(startIndex, startIndex + pageSize);
    return { data, total, page, pageSize, totalPages };
  }

  async getUserById(id: string): Promise<User | null> {
    await this.delay(40);
    const u = this.users.find((user) => user.id === id);
    return u ? { ...u } : null;
  }

  async createUser(
    user: Omit<User, "id" | "createdAt" | "lastAccessAt">
  ): Promise<User> {
    await this.delay(120);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const newUser: User = {
      ...user,
      id: `usr_${Date.now().toString(36)}`,
      lastAccessAt: demoClock.now().toISOString(),
      createdAt: demoClock.now().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: string, userUpdate: Partial<User>): Promise<User> {
    await this.delay(100);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const u = this.users.find((user) => user.id === id);
    if (!u) throw new Error("Usuário não encontrado");
    Object.assign(u, userUpdate);
    return { ...u };
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.delay(100);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const user = this.users.find((u) => u.id === id);
    if (!user) return false;

    // Impede remover o último titular
    if (user.role === "TITULAR") {
      const titulars = this.users.filter((u) => u.role === "TITULAR");
      if (titulars.length <= 1) {
        throw new Error(
          "Não é possível remover o único usuário Titular da conta."
        );
      }
    }

    this.users = this.users.filter((u) => u.id !== id);
    return true;
  }

  // --- WEBHOOKS ---
  async getWebhooks(): Promise<WebhookConfig[]> {
    await this.delay(50);
    return [...this.webhooks];
  }

  async createWebhook(
    webhook: Omit<WebhookConfig, "id" | "createdAt">
  ): Promise<WebhookConfig> {
    await this.delay(120);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const newWh: WebhookConfig = {
      ...webhook,
      id: `wh_${Date.now().toString(36)}`,
      createdAt: demoClock.now().toISOString(),
    };
    this.webhooks.push(newWh);
    return newWh;
  }

  async updateWebhook(
    id: string,
    webhookUpdate: Partial<WebhookConfig>
  ): Promise<WebhookConfig> {
    await this.delay(90);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const wh = this.webhooks.find((item) => item.id === id);
    if (!wh) throw new Error("Webhook não encontrado");
    Object.assign(wh, webhookUpdate);
    return { ...wh };
  }

  async deleteWebhook(id: string): Promise<boolean> {
    await this.delay(80);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    this.webhooks = this.webhooks.filter((wh) => wh.id !== id);
    return true;
  }

  // --- NOTIFICAÇÕES & SEGURANÇA ---
  async getNotifications(): Promise<Notification[]> {
    await this.delay(40);
    return [...this.notifications];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
  }

  async markAllNotificationsAsRead(): Promise<void> {
    this.notifications.forEach((n) => (n.read = true));
  }

  async getSecurityEvents(): Promise<SecurityEvent[]> {
    await this.delay(50);
    return [...this.securityEvents];
  }

  async updateSecuritySetting(
    type: "PIN" | "PASSWORD" | "2FA",
    payload: { currentPin?: string; newPin?: string; currentPassword?: string; newPassword?: string; enabled?: boolean }
  ): Promise<boolean> {
    await this.delay(150);
    if (this.activeScenario === "READONLY") {
      throw new Error("Operação bloqueada: o perfil atual (Consulta) possui apenas permissão de leitura.");
    }
    const nowIso = demoClock.now().toISOString();

    if (type === "PIN") {
      this.securityEvents.unshift({
        id: `sec_${Date.now()}`,
        type: "PIN_CHANGE",
        description: "Senha de pagamento (PIN) alterada na demonstração",
        simulatedIp: "187.54.12.98 (São Paulo, BR)",
        createdAt: nowIso,
      });
    } else if (type === "2FA") {
      this.securityEvents.unshift({
        id: `sec_${Date.now()}`,
        type: payload.enabled ? "TWO_FACTOR_ENABLE" : "TWO_FACTOR_DISABLE",
        description: payload.enabled
          ? "Autenticação em dois fatores ativada"
          : "Autenticação em dois fatores desativada",
        simulatedIp: "187.54.12.98 (São Paulo, BR)",
        createdAt: nowIso,
      });
    } else {
      this.securityEvents.unshift({
        id: `sec_${Date.now()}`,
        type: "PASSWORD_CHANGE",
        description: "Senha de acesso ao painel alterada",
        simulatedIp: "187.54.12.98 (São Paulo, BR)",
        createdAt: nowIso,
      });
    }

    return true;
  }

  // --- CENÁRIOS DE DEMONSTRAÇÃO ---
  async getActiveScenario(): Promise<string> {
    return this.activeScenario;
  }

  async getCurrentUser(): Promise<User> {
    return { ...this.currentUser };
  }

  async switchScenario(scenarioName: string): Promise<void> {
    await this.delay(80);
    this.activeScenario = scenarioName;

    if (scenarioName === "NEW_ACCOUNT") {
      this.account = {
        ...initialAccount,
        initialBalanceInCents: 0,
        settledBalanceInCents: 0,
        currentAvailableBalanceInCents: 0,
        reservedBalanceInCents: 0,
        usedDailyLimitInCents: 0,
      };
      this.transactions = [];
      this.charges = [];
      this.ledgerEntries = [];
      this.batches = [];
      this.approvals = [];
      this.reservations = [];
      this.currentUser = { ...initialUsers[0] };
      return;
    }

    // Para todos os demais cenários, primeiro carrega uma base consistente
    this.account = { ...initialAccount };
    this.users = [...initialUsers];
    this.currentUser = { ...initialUsers[0] };
    this.approvalRules = [...initialApprovalRules];
    this.webhooks = [...initialWebhooks];
    this.notifications = [...initialNotifications];
    this.securityEvents = [...initialSecurityEvents];
    this.reservations = [];

    const generated = generateDeterministicTransactions();
    this.transactions = generated.transactions;
    this.charges = generated.charges;
    this.ledgerEntries = generated.ledgerEntries;
    this.batches = generated.batches;
    this.approvals = generated.approvals;

    if (scenarioName === "INSUFFICIENT_FUNDS") {
      this.account.initialBalanceInCents = 5000;
      this.account.settledBalanceInCents = 5000; // R$ 50,00
      this.account.currentAvailableBalanceInCents = 5000;
      this.account.reservedBalanceInCents = 0;
      this.account.usedDailyLimitInCents = 120000;
      this.reservations = [];
    } else if (scenarioName === "LIMIT_REACHED") {
      this.account.usedDailyLimitInCents = this.account.dailyLimitInCents; // 100% do teto
      this.recalculateBalances();
    } else if (scenarioName === "READONLY") {
      this.currentUser = {
        id: "usr_consulta",
        name: "Lucas Mendes",
        email: "lucas.mendes@nexuspagamentos.com.br",
        document: "321.654.987-00",
        phone: "(11) 98888-7777",
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
        lastAccessAt: demoClock.now().toISOString(),
        createdAt: demoClock.now().toISOString(),
      };
      this.recalculateBalances();
    } else if (scenarioName === "APPROVALS_PENDING") {
      const nowIso = demoClock.now().toISOString();
      this.approvals = [
        {
          id: "appr_demo_01",
          operationType: "WITHDRAWAL",
          operationId: "tx_wd_pend_01",
          amountInCents: 1850000, // R$ 18.500,00
          feeInCents: 27750,
          totalInCents: 1877750,
          counterpartyName: "Tech Supply Distribuidora Ltda",
          counterpartyKey: "12.987.654/0001-32",
          requesterId: "usr_2",
          requesterName: "Carlos Eduardo",
          ruleSnapshot: this.approvalRules[0],
          requiredApprovals: 2,
          currentApprovalsCount: 0,
          decisions: [],
          status: "PENDING",
          createdAt: nowIso,
        },
        {
          id: "appr_demo_02",
          operationType: "WITHDRAWAL",
          operationId: "tx_wd_pend_02",
          amountInCents: 4500000, // R$ 45.000,00
          feeInCents: 67500,
          totalInCents: 4567500,
          counterpartyName: "Logística Express do Brasil S.A.",
          counterpartyKey: "financeiro@logisticaexpress.com.br",
          requesterId: "usr_2",
          requesterName: "Carlos Eduardo",
          ruleSnapshot: this.approvalRules[0],
          requiredApprovals: 2,
          currentApprovalsCount: 1,
          decisions: [
            {
              userId: "usr_3",
              userName: "Beatriz Lima",
              decision: "APPROVE",
              decidedAt: nowIso,
            },
          ],
          status: "PENDING",
          createdAt: nowIso,
        },
        {
          id: "appr_demo_03",
          operationType: "BATCH",
          operationId: "batch_demo_pend_03",
          amountInCents: 3200000, // R$ 32.000,00
          feeInCents: 48000,
          totalInCents: 3248000,
          counterpartyName: "Folha de Prestadores de Serviço",
          counterpartyKey: "98.765.432/0001-10",
          requesterId: "usr_2",
          requesterName: "Carlos Eduardo",
          ruleSnapshot: this.approvalRules[0],
          requiredApprovals: 2,
          currentApprovalsCount: 0,
          decisions: [],
          status: "PENDING",
          createdAt: nowIso,
        },
      ];
      this.recalculateBalances();
    } else if (scenarioName === "PARTIAL_BATCH") {
      const nowIso = demoClock.now().toISOString();
      const partialBatch: Batch = {
        id: "batch_demo_partial",
        description: "Lote Fornecedores Março (Falha Parcial)",
        targetKey: "fornecedores@nexus.com.br",
        targetKeyType: "EMAIL",
        recipientName: "Fornecedores Parceiros S.A.",
        status: "PARTIALLY_COMPLETED",
        totalAmountInCents: 4500000,
        totalFeeInCents: 67500,
        totalDebitInCents: 4567500,
        completedAmountInCents: 3000000,
        pendingAmountInCents: 0,
        failedAmountInCents: 1500000,
        installments: [
          {
            id: "inst_part_1",
            batchId: "batch_demo_partial",
            index: 1,
            totalInstallments: 3,
            amountInCents: 1500000,
            feeInCents: 22500,
            status: "COMPLETED",
            transactionId: "tx_batch_part_01",
            settledAt: nowIso,
          },
          {
            id: "inst_part_2",
            batchId: "batch_demo_partial",
            index: 2,
            totalInstallments: 3,
            amountInCents: 1500000,
            feeInCents: 22500,
            status: "COMPLETED",
            transactionId: "tx_batch_part_02",
            settledAt: nowIso,
          },
          {
            id: "inst_part_3",
            batchId: "batch_demo_partial",
            index: 3,
            totalInstallments: 3,
            amountInCents: 1500000,
            feeInCents: 22500,
            status: "FAILED",
            failureReason: "Chave Pix destinatária inexistente ou conta bloqueada",
          },
        ],
        createdAt: nowIso,
      };
      this.batches.unshift(partialBatch);
      this.recalculateBalances();
    } else if (scenarioName === "PENDING_REVIEW") {
      this.activeScenario = "PENDING_REVIEW";
      this.accountRegistrationStatus = "PENDING_REVIEW";
      sessionService.setSession({
        userId: "usr_pending_demo",
        name: "Gabriel Silva",
        email: "gabriel.silva@slopay.com.br",
        accountStatus: "PENDING_REVIEW",
        submittedAt: new Date().toISOString(),
        companyName: "SloPay Soluções em Pagamentos Ltda",
      });
    } else if (scenarioName === "UNAUTHENTICATED") {
      this.activeScenario = "UNAUTHENTICATED";
      sessionService.clearSession();
    } else {
      // NORMAL
      await this.resetScenario();
    }
  }

  // Autenticação & Onboarding
  async authenticate(
    email: string,
    password?: string,
    twoFactorCode?: string
  ): Promise<{
    success: boolean;
    user: User;
    accountStatus: AccountRegistrationStatus;
    requires2FA?: boolean;
  }> {
    const cleanEmail = email.trim().toLowerCase();

    await this.delay(350);

    // Cenário especial se o email for explicitamente de conta pendente
    if (
      cleanEmail === "pendente@empresa.com.br" ||
      (this.activeScenario === "PENDING_REVIEW" && cleanEmail.includes("pendente"))
    ) {
      const pendingUser: User = {
        id: "usr_pending_demo",
        name: "Gabriel Silva (Pendente)",
        email: cleanEmail,
        document: "•••.554.890-••",
        phone: "(11) 98888-7777",
        role: "TITULAR",
        status: "ACTIVE",
        permissions: initialUsers[0].permissions,
        lastAccessAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      this.accountRegistrationStatus = "PENDING_REVIEW";
      this.activeScenario = "PENDING_REVIEW";
      sessionService.setSession({
        userId: pendingUser.id,
        name: pendingUser.name,
        email: pendingUser.email,
        accountStatus: "PENDING_REVIEW",
        submittedAt: this.onboardingSubmission?.submittedAt || new Date().toISOString(),
        companyName: "Empresa em Validação Ltda",
      });
      return { success: true, user: pendingUser, accountStatus: "PENDING_REVIEW" };
    }

    // Busca se é usuário administrativo
    const adminMatch = this.adminUsers.find((a) => a.email.toLowerCase() === cleanEmail);
    if (adminMatch || cleanEmail === "admin@slopay.com.br") {
      const activeAdmin = adminMatch || this.adminUsers[0];
      this.currentUser = {
        id: activeAdmin.id,
        name: activeAdmin.name,
        email: activeAdmin.email,
        document: "•••.123.456-••",
        phone: "(11) 98765-4321",
        role: "ADMINISTRADOR",
        status: "ACTIVE",
        permissions: initialUsers[0].permissions,
        createdAt: activeAdmin.createdAt,
        lastAccessAt: new Date().toISOString(),
      };
      sessionService.setSession({
        userId: activeAdmin.id,
        name: activeAdmin.name,
        email: activeAdmin.email,
        accountStatus: "APPROVED",
        companyName: "SloPay Administração",
        isAdmin: true,
        adminRole: activeAdmin.role,
      });
      return { success: true, user: this.currentUser, accountStatus: "APPROVED" };
    }

    // Busca usuário existente na base mock
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // Se for acesso Gabriel Silva
    if (
      !user &&
      (cleanEmail.includes("gabriel") ||
        cleanEmail === "gabriel.silva@slopay.com.br")
    ) {
      user = {
        id: "usr_gabriel_silva",
        name: "Gabriel Silva",
        email: "gabriel.silva@slopay.com.br",
        document: "•••.789.012-••",
        phone: "(11) 99887-1122",
        role: "TITULAR",
        status: "ACTIVE",
        permissions: initialUsers[0].permissions,
        lastAccessAt: new Date().toISOString(),
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      if (!this.users.some((u) => u.id === user?.id)) {
        this.users.unshift(user);
      }
    }

    // Validação de senha: se foi informada e tem menos de 6 caracteres
    if (!password || password.trim().length < 6) {
      if (cleanEmail !== "gabriel.silva@slopay.com.br" && !cleanEmail.includes("demo")) {
        throw new Error("E-mail ou senha incorretos.");
      }
    }

    if (!user) {
      throw new Error("E-mail ou senha incorretos.");
    }

    this.currentUser = user;
    const currentStatus =
      this.accountRegistrationStatus === "PENDING_REVIEW" ? "PENDING_REVIEW" : "APPROVED";

    sessionService.setSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      accountStatus: currentStatus,
      companyName: this.account.companyName,
    });

    return { success: true, user, accountStatus: currentStatus };
  }

  async getRegistrationStatus(): Promise<AccountRegistrationStatus> {
    const session = sessionService.getSession();
    if (session?.accountStatus) {
      this.accountRegistrationStatus = session.accountStatus;
      return session.accountStatus;
    }
    return this.accountRegistrationStatus;
  }

  async submitOnboarding(
    data: OnboardingFormData
  ): Promise<{ success: boolean; submittedAt: string; accountId: string }> {
    const cleanCpf = (data.cpf || "").replace(/\D/g, "");
    const cleanEmail = ((data as any).accessEmail || data.email || "").trim().toLowerCase();
    await this.delay(700);
    const submittedAt = new Date().toISOString();
    this.onboardingSubmission = { submittedAt, data: { email: cleanEmail } };
    this.accountRegistrationStatus = "PENDING_REVIEW";
    this.activeScenario = "PENDING_REVIEW";

    const newAccountId = `acc_${Math.random().toString(36).substring(2, 9)}`;
    const newUserId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    const newAppId = `app-${Date.now()}`;

    sessionService.setSession({
      userId: newUserId,
      name: data.fullName || "Titular Cadastrado",
      email: cleanEmail,
      accountStatus: "PENDING_REVIEW",
      submittedAt,
      companyName: data.tradeName || data.legalName || "Minha Empresa",
    });

    // Cria e insere solicitação na fila de abertura de contas do Superadmin
    const cleanCnpj = (data.cnpj || "").replace(/\D/g, "");
    const newApplication: AccountApplication = {
      id: newAppId,
      companyName: data.legalName || data.tradeName || "NOVA EMPRESA CREDENCIADA",
      tradeName: data.tradeName || data.legalName || "Nova Empresa",
      cnpj: cleanCnpj || "00000000000100",
      cnpjMasked: data.cnpj || "00.000.000/0001-00",
      responsibleName: data.fullName || "Titular Cadastrado",
      responsibleCpf: cleanCpf || "00000000000",
      responsibleEmail: data.email,
      responsiblePhone: data.phone || "(11) 99999-9999",
      roleInCompany: data.roleInCompany || "SOCIO",
      segment: data.businessSegment || "SERVICOS",
      companySize: data.companySize || "1-10",
      status: "RECEIVED",
      submittedAt,
      updatedAt: submittedAt,
      history: [
        {
          id: `hist-${Date.now()}-1`,
          timestamp: submittedAt,
          actorName: data.fullName || "Titular",
          action: "SUBMISSAO",
          description: "Envio inicial de dados para abertura de conta.",
          toStatus: "RECEIVED",
        },
      ],
      checklist: {
        dataComplete: true,
        documentCoherence: true,
        complianceCleared: false,
        policyAgreed: true,
      },
    };
    this.applications.unshift(newApplication);

    sessionService.setSession({
      userId: newUserId,
      name: data.fullName,
      email: data.email,
      accountStatus: "PENDING_REVIEW",
      submittedAt,
      companyName: data.tradeName || data.legalName,
    });

    broadcastSync("NEW_APPLICATION_SUBMITTED", { applicationId: newAppId });

    return {
      success: true,
      submittedAt,
      accountId: newAccountId,
    };
  }

  async checkValidationStatus(): Promise<{
    status: AccountRegistrationStatus;
    message?: string;
    submittedAt?: string;
    email?: string;
  }> {
    await this.delay(200);
    const session = sessionService.getSession();
    const status = session?.accountStatus || this.accountRegistrationStatus;
    const submittedAt =
      this.onboardingSubmission?.submittedAt || session?.submittedAt || new Date().toISOString();
    const email =
      this.onboardingSubmission?.data.email || session?.email || "contato@empresa.com.br";

    return {
      status,
      message:
        "Nossa equipe está validando a sua conta, será enviada a confirmação pro seu email quando finalizarmos.",
      submittedAt,
      email,
    };
  }

  async resetScenario(): Promise<void> {
    await this.delay(80);
    this.activeScenario = "NORMAL";
    this.accountRegistrationStatus = "APPROVED";
    this.account = { ...initialAccount };
    this.users = [...initialUsers];
    this.currentUser = { ...initialUsers[0] };
    this.approvalRules = [...initialApprovalRules];
    this.webhooks = [...initialWebhooks];
    this.notifications = [...initialNotifications];
    this.securityEvents = [...initialSecurityEvents];
    this.reservations = [];

    this.adminUsers = [...INITIAL_ADMIN_USERS];
    this.companies = [...INITIAL_COMPANIES];
    this.adminAccounts = [...INITIAL_ACCOUNTS];
    this.applications = [...INITIAL_APPLICATIONS];
    this.pricingPolicies = [...INITIAL_PRICING_POLICIES];
    this.limitPolicies = [...INITIAL_LIMIT_POLICIES];
    this.auditEvents = [...INITIAL_AUDIT_EVENTS];

    const generated = generateDeterministicTransactions();
    this.transactions = generated.transactions;
    this.charges = generated.charges;
    this.ledgerEntries = generated.ledgerEntries;
    this.batches = generated.batches;
    this.approvals = generated.approvals;

    sessionService.setSession({
      userId: initialUsers[0].id,
      name: initialUsers[0].name,
      email: initialUsers[0].email,
      accountStatus: "APPROVED",
      companyName: initialAccount.companyName,
    });

    demoClock.reset();
    this.recalculateBalances();
  }

  // ========================================================
  // SUPERADMIN IMPLEMENTATIONS
  // ========================================================

  private logAuditEvent(params: Omit<AuditEvent, "id" | "timestamp" | "status"> & { status?: "SUCCESS" | "FAILED" }) {
    const event: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      status: params.status || "SUCCESS",
      ...params,
    };
    this.auditEvents.unshift(event);
  }

  // Empresas & Contas
  async getCompanies(filters?: AdminFilterState): Promise<PaginatedResult<Company>> {
    await this.delay(120);
    let result = [...this.companies];

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.legalName.toLowerCase().includes(q) ||
          c.tradeName.toLowerCase().includes(q) ||
          c.cnpj.includes(q.replace(/\D/g, "")) ||
          c.responsibleName.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== "ALL") {
      result = result.filter((c) => c.status === filters.status);
    }

    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      result = result.filter((c) => new Date(c.createdAt).getTime() >= start);
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      result = result.filter((c) => new Date(c.createdAt).getTime() <= end);
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const data = result.slice(startIdx, startIdx + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getCompanyById(id: string): Promise<Company | null> {
    await this.delay(80);
    return this.companies.find((c) => c.id === id) || null;
  }

  async updateCompany(id: string, data: Partial<Company>, reason: string): Promise<Company> {
    await this.delay(150);
    const index = this.companies.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Empresa não encontrada.");

    const before = { ...this.companies[index] };
    const updated = {
      ...this.companies[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.companies[index] = updated;

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "EDICAO_CADASTRO",
      entityType: "COMPANY",
      entityId: id,
      companyId: id,
      companyName: updated.legalName,
      reason,
      diffSanitized: { data: { before, after: data } },
    });

    broadcastSync("COMPANY_UPDATED", { companyId: id });
    return updated;
  }

  async setCompanyStatus(id: string, status: CompanyStatus, reason: string): Promise<Company> {
    await this.delay(150);
    const company = this.companies.find((c) => c.id === id);
    if (!company) throw new Error("Empresa não encontrada.");

    const prevStatus = company.status;
    company.status = status;
    company.updatedAt = new Date().toISOString();
    if (status === "SUSPENDED") {
      company.suspensionReason = reason;
    } else {
      company.suspensionReason = undefined;
    }

    // Atualiza status de contas operacionais associadas se for suspensão/reativação
    this.adminAccounts.forEach((acc) => {
      if (acc.companyId === id) {
        if (status === "SUSPENDED") acc.status = "SUSPENDED";
        if (status === "ACTIVE" && acc.status === "SUSPENDED") acc.status = "ACTIVE";
      }
    });

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: status === "SUSPENDED" ? "SUSPENSAO_EMPRESA" : "REATIVACAO_EMPRESA",
      entityType: "COMPANY",
      entityId: id,
      companyId: id,
      companyName: company.legalName,
      reason,
      diffSanitized: { status: { before: prevStatus, after: status } },
    });

    broadcastSync("COMPANY_STATUS_CHANGED", { companyId: id, status });
    return company;
  }

  async getAccounts(filters?: AdminFilterState): Promise<PaginatedResult<Account>> {
    await this.delay(100);
    let result = [...this.adminAccounts];

    if (filters?.companyId && filters.companyId !== "ALL") {
      result = result.filter((a) => a.companyId === filters.companyId);
    }

    if (filters?.status && filters.status !== "ALL") {
      result = result.filter((a) => a.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.accountNumber.toLowerCase().includes(q) ||
          (a.companyName && a.companyName.toLowerCase().includes(q)) ||
          (a.companyTradeName && a.companyTradeName.toLowerCase().includes(q))
      );
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const data = result.slice(startIdx, startIdx + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getAccountById(id: string): Promise<Account | null> {
    await this.delay(60);
    if (this.account.id === id) return this.account;
    return this.adminAccounts.find((a) => a.id === id) || null;
  }

  async setAccountStatus(id: string, status: AccountOperationalStatus, reason: string): Promise<Account> {
    await this.delay(140);
    let target = this.adminAccounts.find((a) => a.id === id);
    if (!target && this.account.id === id) target = this.account;
    if (!target) throw new Error("Conta não encontrada.");

    const prev = target.status;
    target.status = status;

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: status === "SUSPENDED" ? "BLOQUEIO_OPERACIONAL" : "ALTERACAO_STATUS_CONTA",
      entityType: "ACCOUNT",
      entityId: id,
      companyId: target.companyId,
      companyName: target.companyName || target.companyTradeName,
      reason,
      diffSanitized: { status: { before: prev, after: status } },
    });

    broadcastSync("ACCOUNT_STATUS_CHANGED", { accountId: id, status });
    return target;
  }

  // Fila de Abertura de Contas (Onboarding Review)
  async getAccountApplications(
    filters?: AdminFilterState & { statusTab?: string }
  ): Promise<PaginatedResult<AccountApplication>> {
    await this.delay(100);
    let result = [...this.applications];

    if (filters?.statusTab && filters.statusTab !== "ALL") {
      result = result.filter((app) => app.status === filters.statusTab);
    } else if (filters?.status && filters.status !== "ALL") {
      result = result.filter((app) => app.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (app) =>
          app.companyName.toLowerCase().includes(q) ||
          (app.tradeName && app.tradeName.toLowerCase().includes(q)) ||
          app.cnpj.includes(q.replace(/\D/g, "")) ||
          app.responsibleName.toLowerCase().includes(q) ||
          app.responsibleEmail.toLowerCase().includes(q)
      );
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const data = result.slice(startIdx, startIdx + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getApplicationById(id: string): Promise<AccountApplication | null> {
    await this.delay(70);
    return this.applications.find((app) => app.id === id) || null;
  }

  async assignAnalyst(
    applicationId: string,
    analystId: string,
    analystName: string
  ): Promise<AccountApplication> {
    await this.delay(120);
    const app = this.applications.find((a) => a.id === applicationId);
    if (!app) throw new Error("Solicitação não encontrada.");

    app.assignedAnalystId = analystId;
    app.assignedAnalystName = analystName;
    if (app.status === "RECEIVED") {
      app.status = "UNDER_REVIEW";
    }
    app.updatedAt = new Date().toISOString();

    app.history.unshift({
      id: `hist-${Date.now()}`,
      timestamp: app.updatedAt,
      actorId: analystId,
      actorName: analystName,
      action: "ATRIBUICAO",
      description: `Analista ${analystName} assumiu a análise documental.`,
      toStatus: app.status,
    });

    this.logAuditEvent({
      actorId: analystId,
      actorName: analystName,
      actorRole: "ONBOARDING_ANALYST",
      actionType: "ATRIBUICAO_ANALISTA",
      entityType: "APPLICATION",
      entityId: applicationId,
      companyName: app.companyName,
      reason: "Atribuição formal de responsabilidade técnica pela esteira de KYC.",
    });

    broadcastSync("APPLICATION_ASSIGNED", { applicationId, analystId });
    return app;
  }

  async requestApplicationAdjustments(params: {
    applicationId: string;
    fields: string[];
    instructions: string;
    internalNotes?: string;
  }): Promise<AccountApplication> {
    await this.delay(180);
    const app = this.applications.find((a) => a.id === params.applicationId);
    if (!app) throw new Error("Solicitação não encontrada.");

    app.status = "CHANGES_REQUESTED";
    app.requestedAdjustmentFields = params.fields;
    app.clientInstructions = params.instructions;
    if (params.internalNotes) app.internalNotes = params.internalNotes;
    app.updatedAt = new Date().toISOString();

    app.history.unshift({
      id: `hist-${Date.now()}`,
      timestamp: app.updatedAt,
      actorName: "Compliance Desk",
      action: "SOLICITACAO_AJUSTE",
      description: `Ajuste solicitado nos campos: ${params.fields.join(", ")}. Instrução: ${params.instructions}`,
      toStatus: "CHANGES_REQUESTED",
    });

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "SOLICITACAO_AJUSTES",
      entityType: "APPLICATION",
      entityId: params.applicationId,
      companyName: app.companyName,
      reason: params.instructions,
    });

    // Se o cliente atual for o autor desta solicitação, atualiza a sessão imediatamente
    const currentSession = sessionService.getSession();
    if (currentSession && (currentSession.email === app.responsibleEmail || currentSession.name === app.responsibleName)) {
      sessionService.setSession({
        ...currentSession,
        accountStatus: "CHANGES_REQUESTED",
      });
    }

    broadcastSync("APPLICATION_CHANGES_REQUESTED", {
      applicationId: params.applicationId,
      fields: params.fields,
      instructions: params.instructions,
    });

    return app;
  }

  async approveApplication(params: {
    applicationId: string;
    internalNotes?: string;
    pricingPolicyId?: string;
  }): Promise<{ application: AccountApplication; createdAccount: Account }> {
    await this.delay(250);
    const app = this.applications.find((a) => a.id === params.applicationId);
    if (!app) throw new Error("Solicitação não encontrada.");

    const now = new Date().toISOString();
    app.status = "APPROVED";
    app.decidedAt = now;
    app.updatedAt = now;
    if (params.internalNotes) app.internalNotes = params.internalNotes;

    // Localiza ou cadastra empresa correspondente
    let comp = this.companies.find((c) => c.cnpj === app.cnpj);
    if (!comp) {
      const newComp: Company = {
        id: `comp-${this.companies.length + 1 < 10 ? "0" : ""}${this.companies.length + 1}`,
        legalName: app.companyName,
        tradeName: app.tradeName || app.companyName,
        cnpj: app.cnpj,
        cnpjMasked: app.cnpjMasked,
        status: "ACTIVE",
        segment: app.segment,
        companySize: app.companySize,
        website: app.website,
        responsibleName: app.responsibleName,
        responsibleCpf: app.responsibleCpf,
        responsibleEmail: app.responsibleEmail,
        responsiblePhone: app.responsiblePhone,
        roleInCompany: app.roleInCompany,
        createdAt: now,
        updatedAt: now,
        accountCount: 1,
        activeAccountCount: 1,
        totalVolumeInCents: 0,
      };
      this.companies.unshift(newComp);
      comp = newComp;
    } else {
      comp.status = "ACTIVE";
      comp.accountCount += 1;
      comp.activeAccountCount += 1;
    }

    // Cria Conta Operacional Oficial
    const nextAccNumber = `00${this.adminAccounts.length + 1}001-8`;
    const createdAccount: Account = {
      id: `acc-${this.adminAccounts.length + 1}`,
      companyId: comp.id,
      companyName: comp.legalName,
      companyTradeName: comp.tradeName,
      accountNumber: nextAccNumber,
      status: "ACTIVE",
      accountStatus: "APPROVED",
      bookBalanceInCents: 0,
      reservedBalanceInCents: 0,
      availableBalanceInCents: 0,
      dailyLimitInCents: 10000000, // R$ 100.000,00
      transactionLimitInCents: 5000000, // R$ 50.000,00
      createdAt: now,
      lastMovementAt: now,
      initialBalanceInCents: 0,
      settledBalanceInCents: 0,
      currentAvailableBalanceInCents: 0,
      usedDailyLimitInCents: 0,
      accountType: "PAYMENT_INSTITUTION",
      agency: "0001",
      bankName: "SloPay Instituição de Pagamento",
      ispb: "12345678",
      qrCodeDynamicCount: 0,
      pixKeyCount: 1,
      pixKeys: [
        {
          id: `key-${Date.now()}`,
          type: "CNPJ",
          value: app.cnpjMasked,
          createdAt: now,
          status: "ACTIVE",
        },
      ],
    };
    this.adminAccounts.unshift(createdAccount);

    app.history.unshift({
      id: `hist-${Date.now()}`,
      timestamp: now,
      actorName: "Gabriel Santos",
      action: "APROVACAO",
      description: `Conta ${nextAccNumber} criada com sucesso e aprovada para operação.`,
      toStatus: "APPROVED",
    });

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "APROVACAO_CONTA",
      entityType: "APPLICATION",
      entityId: params.applicationId,
      companyId: comp.id,
      companyName: comp.legalName,
      reason: params.internalNotes || "Aprovação cadastral e documental em conformidade com política de risco.",
      diffSanitized: {
        status: { before: "UNDER_REVIEW", after: "APPROVED" },
        account: { before: null, after: nextAccNumber },
      },
    });

    // Se houver sessão ativa do cliente no navegador (ou na janela paralela), promove para APPROVED
    const currentSession = sessionService.getSession();
    if (
      currentSession &&
      (currentSession.email === app.responsibleEmail || currentSession.name === app.responsibleName || currentSession.accountStatus === "PENDING_REVIEW")
    ) {
      sessionService.setSession({
        ...currentSession,
        accountStatus: "APPROVED",
        companyName: comp.tradeName,
      });
      this.accountRegistrationStatus = "APPROVED";
      this.account.accountStatus = "APPROVED";
    }

    broadcastSync("APPLICATION_APPROVED", {
      applicationId: params.applicationId,
      accountId: createdAccount.id,
      accountNumber: createdAccount.accountNumber,
      responsibleEmail: app.responsibleEmail,
    });

    return { application: app, createdAccount };
  }

  async rejectApplication(params: {
    applicationId: string;
    reason: string;
    internalNotes?: string;
  }): Promise<AccountApplication> {
    await this.delay(200);
    const app = this.applications.find((a) => a.id === params.applicationId);
    if (!app) throw new Error("Solicitação não encontrada.");

    const now = new Date().toISOString();
    app.status = "REJECTED";
    app.decidedAt = now;
    app.rejectionReason = params.reason;
    if (params.internalNotes) app.internalNotes = params.internalNotes;
    app.updatedAt = now;

    app.history.unshift({
      id: `hist-${Date.now()}`,
      timestamp: now,
      actorName: "Gabriel Santos",
      action: "RECUSA",
      description: `Solicitação indeferida. Motivo: ${params.reason}`,
      toStatus: "REJECTED",
    });

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "RECUSA_CADASTRO",
      entityType: "APPLICATION",
      entityId: params.applicationId,
      companyName: app.companyName,
      reason: params.reason,
    });

    // Atualiza status do cliente se for a mesma sessão
    const currentSession = sessionService.getSession();
    if (currentSession && (currentSession.email === app.responsibleEmail || currentSession.name === app.responsibleName)) {
      sessionService.setSession({
        ...currentSession,
        accountStatus: "REJECTED",
      });
    }

    broadcastSync("APPLICATION_REJECTED", { applicationId: params.applicationId, reason: params.reason });
    return app;
  }

  async reopenApplication(params: { applicationId: string; reason: string }): Promise<AccountApplication> {
    await this.delay(150);
    const app = this.applications.find((a) => a.id === params.applicationId);
    if (!app) throw new Error("Solicitação não encontrada.");

    const prev = app.status;
    app.status = "UNDER_REVIEW";
    app.updatedAt = new Date().toISOString();

    app.history.unshift({
      id: `hist-${Date.now()}`,
      timestamp: app.updatedAt,
      actorName: "Gabriel Santos",
      action: "REABERTURA",
      description: `Solicitação reaberta para reavaliação. Motivo: ${params.reason}`,
      toStatus: "UNDER_REVIEW",
    });

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "REABERTURA_PROCESSO",
      entityType: "APPLICATION",
      entityId: params.applicationId,
      companyName: app.companyName,
      reason: params.reason,
      diffSanitized: { status: { before: prev, after: "UNDER_REVIEW" } },
    });

    broadcastSync("APPLICATION_REOPENED", { applicationId: params.applicationId });
    return app;
  }

  // Visão Global & Operações
  async getGlobalOverviewMetrics(filters?: AdminFilterState): Promise<{
    inflowsAmountInCents: number;
    inflowsCount: number;
    outflowsAmountInCents: number;
    outflowsCount: number;
    feesAmountInCents: number;
    activeCompaniesCount: number;
    activeAccountsCount: number;
    recentTransactions: Transaction[];
    volumeByCompany: { companyName: string; volumeInCents: number; count: number }[];
  }> {
    await this.delay(120);
    let allTx = [...this.transactions];

    if (filters?.companyId && filters.companyId !== "ALL") {
      allTx = allTx.filter((t) => t.companyId === filters.companyId);
    }

    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      allTx = allTx.filter((t) => new Date(t.createdAt).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      allTx = allTx.filter((t) => new Date(t.createdAt).getTime() <= end);
    }

    let inflowsAmount = 0;
    let inflowsCount = 0;
    let outflowsAmount = 0;
    let outflowsCount = 0;
    let feesAmount = 0;

    for (const tx of allTx) {
      if (tx.status === "COMPLETED") {
        if (tx.direction === "IN" || tx.type === "PIX_RECEIVE") {
          inflowsAmount += tx.amountInCents;
          inflowsCount += 1;
        } else if (tx.direction === "OUT" || tx.type === "PIX_WITHDRAW") {
          outflowsAmount += tx.amountInCents;
          outflowsCount += 1;
        }
        feesAmount += tx.feeInCents || 0;
      }
    }

    const activeCompanies = this.companies.filter((c) => c.status === "ACTIVE").length;
    const activeAccounts = this.adminAccounts.filter((a) => a.status === "ACTIVE").length;

    // Top empresas por volume
    const volMap = new Map<string, { volume: number; count: number }>();
    this.companies.slice(0, 5).forEach((c) => {
      volMap.set(c.tradeName, { volume: c.totalVolumeInCents, count: 120 });
    });
    const volumeByCompany = Array.from(volMap.entries()).map(([companyName, data]) => ({
      companyName,
      volumeInCents: data.volume,
      count: data.count,
    }));

    return {
      inflowsAmountInCents: inflowsAmount,
      inflowsCount,
      outflowsAmountInCents: outflowsAmount,
      outflowsCount,
      feesAmountInCents: feesAmount,
      activeCompaniesCount: activeCompanies,
      activeAccountsCount: activeAccounts,
      recentTransactions: allTx.slice(0, 10),
      volumeByCompany,
    };
  }

  async getGlobalOperations(
    filters?: AdminFilterState & { type?: string; origin?: string }
  ): Promise<
    PaginatedResult<Transaction> & {
      totalInflowInCents: number;
      totalOutflowInCents: number;
      totalFeesInCents: number;
    }
  > {
    await this.delay(120);
    let result = [...this.transactions];

    if (filters?.type && filters.type !== "ALL") {
      result = result.filter((t) => t.type === filters.type);
    }

    if (filters?.status && filters.status !== "ALL") {
      result = result.filter((t) => t.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.endToEndId && t.endToEndId.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.counterpartyName.toLowerCase().includes(q) ||
          (t.counterpartyDocument && t.counterpartyDocument.includes(q.replace(/\D/g, "")))
      );
    }

    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      result = result.filter((t) => new Date(t.createdAt).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      result = result.filter((t) => new Date(t.createdAt).getTime() <= end);
    }

    let totalInflowInCents = 0;
    let totalOutflowInCents = 0;
    let totalFeesInCents = 0;

    for (const t of result) {
      if (t.direction === "IN" || t.type === "PIX_RECEIVE") totalInflowInCents += t.amountInCents;
      if (t.direction === "OUT" || t.type === "PIX_WITHDRAW") totalOutflowInCents += t.amountInCents;
      totalFeesInCents += t.feeInCents || 0;
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const data = result.slice(startIdx, startIdx + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      totalInflowInCents,
      totalOutflowInCents,
      totalFeesInCents,
    };
  }

  async getGlobalLedgerEntries(filters?: AdminFilterState): Promise<PaginatedResult<LedgerEntry>> {
    await this.delay(100);
    let result = [...this.ledgerEntries];

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          (e.transactionId && e.transactionId.toLowerCase().includes(q))
      );
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 15;
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const data = result.slice(startIdx, startIdx + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getGlobalBalances(filters?: AdminFilterState): Promise<{
    totalBookInCents: number;
    totalReservedInCents: number;
    totalAvailableInCents: number;
    accounts: Account[];
  }> {
    await this.delay(90);
    let accs = [...this.adminAccounts];

    if (filters?.companyId && filters.companyId !== "ALL") {
      accs = accs.filter((a) => a.companyId === filters.companyId);
    }

    let totalBook = 0;
    let totalReserved = 0;
    let totalAvailable = 0;

    for (const a of accs) {
      totalBook += a.bookBalanceInCents || a.settledBalanceInCents || 0;
      totalReserved += a.reservedBalanceInCents || 0;
      totalAvailable += a.availableBalanceInCents || a.currentAvailableBalanceInCents || 0;
    }

    return {
      totalBookInCents: totalBook,
      totalReservedInCents: totalReserved,
      totalAvailableInCents: totalAvailable,
      accounts: accs,
    };
  }

  // Aprovações Financeiras Extraordinárias
  async getFinancialApprovals(filters?: AdminFilterState): Promise<ApprovalRequest[]> {
    await this.delay(90);
    let result = [...this.approvals];

    if (filters?.status && filters.status !== "ALL") {
      result = result.filter((a) => a.status === filters.status);
    }

    return result;
  }

  async decideFinancialApprovalExtraordinary(params: {
    requestId: string;
    decision: "APPROVE" | "REJECT";
    reason: string;
  }): Promise<ApprovalRequest> {
    await this.delay(200);
    const req = this.approvals.find((a) => a.id === params.requestId);
    if (!req) throw new Error("Solicitação de aprovação não encontrada.");

    req.status = params.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    req.decisions.push({
      userId: "admin-01",
      userName: "Gabriel Santos (Superadmin)",
      decision: params.decision,
      reason: params.reason,
      decidedAt: new Date().toISOString(),
    });

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "APROVACAO_EXTRAORDINARIA",
      entityType: "APPROVAL_REQUEST",
      entityId: params.requestId,
      reason: params.reason,
      diffSanitized: { status: { before: "PENDING", after: req.status } },
    });

    this.recalculateBalances();
    broadcastSync("FINANCIAL_APPROVAL_DECIDED", { requestId: params.requestId, decision: req.status });
    return req;
  }

  // Condições Comerciais, Taxas e Limites
  async getPricingPolicies(): Promise<PricingPolicy[]> {
    await this.delay(60);
    return [...this.pricingPolicies];
  }

  async updatePricingPolicy(
    id: string,
    policy: Partial<PricingPolicy>,
    reason: string
  ): Promise<PricingPolicy> {
    await this.delay(150);
    const idx = this.pricingPolicies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Política de preço não encontrada.");

    const before = { ...this.pricingPolicies[idx] };
    const updated = {
      ...this.pricingPolicies[idx],
      ...policy,
      updatedAt: new Date().toISOString(),
      updatedBy: "Gabriel Santos",
      reason,
    };
    this.pricingPolicies[idx] = updated;

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "ALTERACAO_TAXA",
      entityType: "FEE_LIMIT",
      entityId: id,
      companyId: updated.targetId,
      companyName: updated.targetName,
      reason,
      diffSanitized: { policy: { before, after: policy } },
    });

    broadcastSync("PRICING_POLICY_UPDATED", { policyId: id });
    return updated;
  }

  async getLimitPolicies(): Promise<LimitPolicy[]> {
    await this.delay(60);
    return [...this.limitPolicies];
  }

  async updateLimitPolicy(
    id: string,
    policy: Partial<LimitPolicy>,
    reason: string
  ): Promise<LimitPolicy> {
    await this.delay(150);
    const idx = this.limitPolicies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Política de limites não encontrada.");

    const before = { ...this.limitPolicies[idx] };
    const updated = {
      ...this.limitPolicies[idx],
      ...policy,
      updatedAt: new Date().toISOString(),
      updatedBy: "Gabriel Santos",
      reason,
    };
    this.limitPolicies[idx] = updated;

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "ALTERACAO_LIMITE",
      entityType: "FEE_LIMIT",
      entityId: id,
      companyId: updated.targetId,
      companyName: updated.targetName,
      reason,
      diffSanitized: { policy: { before, after: policy } },
    });

    broadcastSync("LIMIT_POLICY_UPDATED", { policyId: id });
    return updated;
  }

  // Equipe Administrativa & Auditoria
  async getAdminTeam(): Promise<AdminUser[]> {
    await this.delay(70);
    return [...this.adminUsers];
  }

  async updateAdminUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    await this.delay(120);
    const user = this.adminUsers.find((u) => u.id === id);
    if (!user) throw new Error("Membro de equipe não encontrado.");

    Object.assign(user, data);

    this.logAuditEvent({
      actorId: "admin-01",
      actorName: "Gabriel Santos",
      actorRole: "SUPERADMIN",
      actionType: "ALTERACAO_PERMISSAO",
      entityType: "SECURITY",
      entityId: id,
      reason: "Alteração de papel/escopo de membro da equipe administrativa.",
    });

    broadcastSync("ADMIN_USER_UPDATED", { adminUserId: id });
    return user;
  }

  async getAuditEvents(
    filters?: AdminFilterState & { entityType?: string }
  ): Promise<PaginatedResult<AuditEvent>> {
    await this.delay(100);
    let result = [...this.auditEvents];

    if (filters?.entityType && filters.entityType !== "ALL") {
      result = result.filter((ev) => ev.entityType === filters.entityType);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (ev) =>
          ev.actorName.toLowerCase().includes(q) ||
          ev.actionType.toLowerCase().includes(q) ||
          (ev.companyName && ev.companyName.toLowerCase().includes(q)) ||
          (ev.reason && ev.reason.toLowerCase().includes(q)) ||
          ev.id.toLowerCase().includes(q)
      );
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 15;
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const data = result.slice(startIdx, startIdx + pageSize);

    return { data, total, page, pageSize, totalPages };
  }

  async getPendingTasksSummary(): Promise<PendingTaskSummary> {
    await this.delay(60);
    const pendingApps = this.applications.filter(
      (a) => a.status === "RECEIVED" || a.status === "UNDER_REVIEW" || a.status === "RESUBMITTED"
    ).length;
    const changesRequested = this.applications.filter((a) => a.status === "CHANGES_REQUESTED").length;
    const pendingApprovals = this.approvals.filter((a) => a.status === "PENDING").length;
    const suspendedCompanies = this.companies.filter((c) => c.status === "SUSPENDED").length;

    return {
      pendingApplicationsCount: pendingApps,
      changesRequestedCount: changesRequested,
      pendingFinancialApprovalsCount: pendingApprovals,
      suspendedCompaniesCount: suspendedCompanies,
      totalUrgentTasks: pendingApps + pendingApprovals,
    };
  }
}

// Instância singleton para o cliente
export const demoRepository = new DemoRepository();
