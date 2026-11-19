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
  AccountRegistrationStatus,
  OnboardingFormData,
} from "@/types/domain";
import type { IndicatorPeriod, IndicatorReport } from "@/features/analytics/indicators";
import type { ApprovalRuleMember } from "@/features/approval-rules/approval-rules";

export interface TransactionFilterParams {
  direction?: "IN" | "OUT";
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserListFilters {
  search?: string;
  role?: User["role"];
  status?: User["status"];
  page?: number;
  pageSize?: number;
}

export interface OverviewMetrics {
  availableBalanceInCents: number;
  settledBalanceInCents: number;
  reservedBalanceInCents: number;
  inflowsCount: number;
  inflowsAmountInCents: number;
  outflowsCount: number;
  outflowsAmountInCents: number;
  feesAmountInCents: number;
  cashflowSeries: {
    date: string;
    inflowsInCents: number;
    outflowsInCents: number;
  }[];
  monthlyComparison: {
    month: string;
    inflowsInCents: number;
    outflowsInCents: number;
  }[];
  recentTransactions: Transaction[];
  pendingApprovalsCount: number;
}

export type ISloPayService = IGatewayService;

export interface IGatewayService {
  // Conta
  getAccount(): Promise<Account>;
  updateProfile(phone: string, expectedUserId: string): Promise<{ success: boolean; phone: string }>;

  // Dashboard & Analytics
  getOverviewMetrics(period?: string): Promise<OverviewMetrics>;
  getAnalytics(period: IndicatorPeriod): Promise<IndicatorReport>;

  // Movimentações & Extrato
  getTransactions(
    filters?: TransactionFilterParams
  ): Promise<
    PaginatedResult<Transaction> & {
      totalInflowInCents: number;
      totalOutflowInCents: number;
      totalFeesInCents: number;
    }
  >;
  getTransactionById(id: string): Promise<Transaction | null>;
  getLedgerEntries(
    filters?: TransactionFilterParams
  ): Promise<PaginatedResult<LedgerEntry>>;

  // Cobranças Pix
  getCharges(filters?: { status?: string; search?: string; page?: number; pageSize?: number }): Promise<PaginatedResult<Charge>>;
  getChargeById(id: string): Promise<Charge | null>;
  createCharge(params: {
    amountInCents: number;
    expirationMinutes: number;
    description?: string;
    payerName?: string;
    payerDocument?: string;
  }): Promise<Charge>;
  simulatePayCharge(chargeId: string): Promise<Charge>;

  // Saque Direto
  requestWithdrawal(params: {
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
  }>;

  // Saques em Lote
  getBatches(filters?: { status?: string; page?: number; pageSize?: number }): Promise<PaginatedResult<Batch>>;
  getBatchById(id: string): Promise<Batch | null>;
  createBatch(params: {
    totalAmountInCents: number;
    targetKey: string;
    targetKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";
    description?: string;
    recipientName?: string;
    pin: string;
  }): Promise<{ batch: Batch; requiresApproval: boolean; approvalRequestId?: string }>;

  // Aprovações
  getApprovals(status?: "PENDING" | "APPROVED" | "REJECTED"): Promise<{
    data: ApprovalRequest[];
    total: number;
    pendingCount: number;
  }>;
  getApprovalById(id: string): Promise<(ApprovalRequest & { nextApprover: Pick<User, "id" | "name"> | null }) | null>;
  decideApproval(params: {
    requestId: string;
    approverId: string;
    decision: "APPROVE" | "REJECT";
    reason?: string;
  }): Promise<ApprovalRequest>;

  // Regras de Aprovação
  getApprovalRules(): Promise<ApprovalRule[]>;
  getApprovalRuleMembers(): Promise<ApprovalRuleMember[]>;
  createApprovalRule(
    rule: Omit<ApprovalRule, "id" | "createdAt">
  ): Promise<ApprovalRule>;
  updateApprovalRule(
    id: string,
    rule: Partial<ApprovalRule>
  ): Promise<ApprovalRule>;
  deleteApprovalRule(id: string): Promise<boolean>;

  // Usuários
  getUsers(filters?: UserListFilters): Promise<PaginatedResult<User>>;
  getUserById(id: string): Promise<User | null>;
  createUser(
    user: Omit<User, "id" | "createdAt" | "lastAccessAt">
  ): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  // Webhooks
  getWebhooks(): Promise<WebhookConfig[]>;
  createWebhook(
    webhook: Omit<WebhookConfig, "id" | "createdAt">
  ): Promise<WebhookConfig>;
  updateWebhook(
    id: string,
    webhook: Partial<WebhookConfig>
  ): Promise<WebhookConfig>;
  deleteWebhook(id: string): Promise<boolean>;

  // Notificações & Segurança
  getNotifications(): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(): Promise<void>;
  getSecurityEvents(): Promise<SecurityEvent[]>;
  updateSecuritySetting(
    type: "PIN" | "PASSWORD" | "2FA",
    payload: { currentPin?: string; newPin?: string; currentPassword?: string; newPassword?: string; enabled?: boolean }
  ): Promise<boolean>;

  authenticate(
    email: string,
    password?: string,
    twoFactorCode?: string
  ): Promise<{
    success: boolean;
    user: User;
    accountStatus: AccountRegistrationStatus;
    requires2FA?: boolean;
  }>;
  getRegistrationStatus(): Promise<AccountRegistrationStatus>;
  submitOnboarding(data: OnboardingFormData): Promise<{ success: boolean; submittedAt: string; accountId: string }>;
  checkValidationStatus(): Promise<{ status: AccountRegistrationStatus; message?: string; submittedAt?: string; email?: string }>;

  // Controle de Demonstração (compatibilidade interna)
  switchScenario(scenarioName: string): Promise<void>;
  resetScenario(): Promise<void>;
  getActiveScenario(): Promise<string>;
  getCurrentUser(): Promise<User>;

  // ========================================================
  // SUPERADMIN CONTRACTS
  // ========================================================

  // Empresas & Contas
  getCompanies(filters?: import("@/types/domain").AdminFilterState): Promise<PaginatedResult<import("@/types/domain").Company>>;
  getCompanyById(id: string): Promise<import("@/types/domain").Company | null>;
  updateCompany(id: string, data: Partial<import("@/types/domain").Company>, reason: string): Promise<import("@/types/domain").Company>;
  setCompanyStatus(id: string, status: import("@/types/domain").CompanyStatus, reason: string): Promise<import("@/types/domain").Company>;

  getAccounts(filters?: import("@/types/domain").AdminFilterState): Promise<PaginatedResult<Account>>;
  getAccountById(id: string): Promise<Account | null>;
  setAccountStatus(id: string, status: import("@/types/domain").AccountOperationalStatus, reason: string): Promise<Account>;

  // Fila de Abertura de Contas (Onboarding Review)
  getAccountApplications(filters?: import("@/types/domain").AdminFilterState & { statusTab?: string }): Promise<PaginatedResult<import("@/types/domain").AccountApplication>>;
  getApplicationById(id: string): Promise<import("@/types/domain").AccountApplication | null>;
  assignAnalyst(applicationId: string, analystId: string, analystName: string): Promise<import("@/types/domain").AccountApplication>;
  requestApplicationAdjustments(params: { applicationId: string; fields: string[]; instructions: string; internalNotes?: string }): Promise<import("@/types/domain").AccountApplication>;
  approveApplication(params: { applicationId: string; internalNotes?: string; pricingPolicyId?: string }): Promise<{ application: import("@/types/domain").AccountApplication; createdAccount: Account }>;
  rejectApplication(params: { applicationId: string; reason: string; internalNotes?: string }): Promise<import("@/types/domain").AccountApplication>;
  reopenApplication(params: { applicationId: string; reason: string }): Promise<import("@/types/domain").AccountApplication>;

  // Visão Global & Operações
  getGlobalOverviewMetrics(filters?: import("@/types/domain").AdminFilterState): Promise<{
    inflowsAmountInCents: number;
    inflowsCount: number;
    outflowsAmountInCents: number;
    outflowsCount: number;
    feesAmountInCents: number;
    activeCompaniesCount: number;
    activeAccountsCount: number;
    recentTransactions: Transaction[];
    volumeByCompany: { companyName: string; volumeInCents: number; count: number }[];
  }>;
  getGlobalOperations(filters?: import("@/types/domain").AdminFilterState & { type?: string; origin?: string }): Promise<PaginatedResult<Transaction> & {
    totalInflowInCents: number;
    totalOutflowInCents: number;
    totalFeesInCents: number;
  }>;
  getGlobalLedgerEntries(filters?: import("@/types/domain").AdminFilterState): Promise<PaginatedResult<LedgerEntry>>;
  getGlobalBalances(filters?: import("@/types/domain").AdminFilterState): Promise<{
    totalBookInCents: number;
    totalReservedInCents: number;
    totalAvailableInCents: number;
    accounts: Account[];
  }>;

  // Aprovações Financeiras Extraordinárias
  getFinancialApprovals(filters?: import("@/types/domain").AdminFilterState): Promise<ApprovalRequest[]>;
  decideFinancialApprovalExtraordinary(params: { requestId: string; decision: "APPROVE" | "REJECT"; reason: string }): Promise<ApprovalRequest>;

  // Condições Comerciais, Taxas e Limites
  getPricingPolicies(): Promise<import("@/types/domain").PricingPolicy[]>;
  updatePricingPolicy(id: string, policy: Partial<import("@/types/domain").PricingPolicy>, reason: string): Promise<import("@/types/domain").PricingPolicy>;
  getLimitPolicies(): Promise<import("@/types/domain").LimitPolicy[]>;
  updateLimitPolicy(id: string, policy: Partial<import("@/types/domain").LimitPolicy>, reason: string): Promise<import("@/types/domain").LimitPolicy>;

  // Equipe Administrativa & Auditoria
  getAdminTeam(): Promise<import("@/types/domain").AdminUser[]>;
  updateAdminUser(id: string, data: Partial<import("@/types/domain").AdminUser>): Promise<import("@/types/domain").AdminUser>;
  getAuditEvents(filters?: import("@/types/domain").AdminFilterState & { entityType?: string }): Promise<PaginatedResult<import("@/types/domain").AuditEvent>>;
  getPendingTasksSummary(): Promise<import("@/types/domain").PendingTaskSummary>;
}
