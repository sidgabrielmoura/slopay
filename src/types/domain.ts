export type UserRole = "TITULAR" | "OPERADOR" | "APROVADOR" | "CONSULTA" | "ADMINISTRADOR";

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface UserPermissions {
  transactions: { view: boolean; export: boolean };
  pixReceive: { create: boolean; view: boolean };
  pixWithdraw: { request: boolean; view: boolean };
  approvals: { decide: boolean; view: boolean };
  rules: { manage: boolean; view: boolean };
  users: { manage: boolean; view: boolean };
  webhooks: { manage: boolean; view: boolean };
  settings: { manage: boolean; view: boolean };
}

export interface User {
  id: string;
  name: string;
  email: string;
  document: string; // Mascarado para exibição
  phone: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  lastAccessAt: string;
  createdAt: string;
}

export interface Account {
  id: string;
  companyId?: string;
  companyName: string;
  companyTradeName?: string;
  document?: string;
  accountNumber: string;
  bankName?: string;
  agency?: string;
  ispb?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  accountStatus?: AccountRegistrationStatus;
  initialBalanceInCents: number;
  currentAvailableBalanceInCents: number;
  settledBalanceInCents: number;
  bookBalanceInCents?: number;
  reservedBalanceInCents: number;
  availableBalanceInCents?: number;
  dailyLimitInCents: number;
  usedDailyLimitInCents: number;
  maxPerTransactionInCents?: number;
  transactionLimitInCents?: number;
  qrCodeDynamicCount?: number;
  pixKeyCount?: number;
  pixKeys?: { id: string; type: string; value: string; createdAt: string; status: string }[];
  accountType?: string;
  createdAt?: string;
  lastMovementAt?: string;
}

export type ChargeStatus = "DRAFT" | "PENDING" | "PAID" | "EXPIRED" | "FAILED";

export interface Charge {
  id: string;
  amountInCents: number;
  feeInCents: number;
  netAmountInCents: number;
  status: ChargeStatus;
  description?: string;
  payerName?: string;
  payerDocument?: string;
  qrCodeUrl: string;
  copyPasteCode: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
}

export type TransactionDirection = "IN" | "OUT";

export type TransactionType = "PIX_RECEIVE" | "PIX_WITHDRAW" | "FEE" | "BATCH_ITEM" | "REVERSAL";

export type TransactionStatus =
  | "PENDING_APPROVAL"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "REVERSED"
  | "UNKNOWN";

export interface Transaction {
  id: string;
  endToEndId?: string;
  direction: TransactionDirection;
  type: TransactionType;
  status: TransactionStatus;
  origin: "PANEL" | "API";
  amountInCents: number;
  feeInCents: number;
  totalDebitedInCents: number; // Para saídas: amount + fee. Para entradas: amount - fee líquido
  counterpartyName: string;
  counterpartyDocument?: string;
  counterpartyKey?: string;
  counterpartyKeyType?: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";
  description?: string;
  chargeId?: string;
  batchId?: string;
  batchInstallmentIndex?: number;
  failureReason?: string;
  approvalRequestId?: string;
  companyId?: string;
  companyName?: string;
  accountId?: string;
  createdAt: string;
  settledAt?: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  date: string;
  type: "CREDIT" | "DEBIT" | "FEE_DEBIT";
  description: string;
  amountInCents: number; // Negativo se débito
  balanceAfterInCents: number;
}

export type BalanceReservationStatus = "ACTIVE" | "SETTLED" | "CANCELLED";

export interface BalanceReservation {
  id: string;
  requestId: string;
  principalInCents: number;
  feeInCents: number;
  totalInCents: number;
  status: BalanceReservationStatus;
  createdAt: string;
  resolvedAt?: string;
}

export type BatchStatus =
  | "PENDING_APPROVAL"
  | "PROCESSING"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export interface BatchInstallment {
  id: string;
  batchId: string;
  index: number;
  totalInstallments: number;
  amountInCents: number;
  feeInCents: number;
  status: TransactionStatus;
  transactionId?: string;
  failureReason?: string;
  settledAt?: string;
}

export interface Batch {
  id: string;
  targetKey: string;
  targetKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";
  recipientName: string;
  recipientDocument?: string;
  description?: string;
  status: BatchStatus;
  totalAmountInCents: number;
  totalFeeInCents: number;
  totalDebitInCents: number;
  completedAmountInCents: number;
  pendingAmountInCents: number;
  failedAmountInCents: number;
  installments: BatchInstallment[];
  approvalRequestId?: string;
  createdAt: string;
  completedAt?: string;
}

export type ApprovalRuleType = "PARALLEL" | "SEQUENTIAL";

export interface ApprovalRule {
  id: string;
  name: string;
  minAmountInCents: number;
  ruleType: ApprovalRuleType;
  eligibleApproverIds: string[];
  requiredApprovalsCount: number;
  active: boolean;
  createdAt: string;
}

export type ApprovalDecisionType = "APPROVE" | "REJECT";

export interface ApprovalDecision {
  userId: string;
  userName: string;
  decision: ApprovalDecisionType;
  reason?: string;
  decidedAt: string;
}

export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalRequest {
  id: string;
  operationType: "WITHDRAWAL" | "BATCH";
  operationId: string;
  amountInCents: number;
  feeInCents: number;
  totalInCents: number;
  counterpartyName: string;
  counterpartyKey: string;
  requesterId: string;
  requesterName: string;
  ruleSnapshot: ApprovalRule;
  requiredApprovals: number;
  currentApprovalsCount: number;
  decisions: ApprovalDecision[];
  status: ApprovalRequestStatus;
  createdAt: string;
  resolvedAt?: string;
}

export type WebhookEventType =
  | "PIX_CHARGE_CREATED"
  | "PIX_RECEIVED"
  | "PIX_CHARGE_EXPIRED"
  | "PIX_REFUNDED"
  | "WITHDRAWAL_REQUESTED"
  | "APPROVAL_REQUIRED"
  | "PIX_SENT"
  | "WITHDRAWAL_FAILED";

export interface WebhookConfig {
  id: string;
  eventType: WebhookEventType;
  eventTypes?: WebhookEventType[];
  name?: string;
  url: string;
  notificationEmail?: string;
  deliveryMode?: "SEQUENTIAL" | "PARALLEL";
  hasAuthToken?: boolean;
  queueInterrupted?: boolean;
  retryEnabled: boolean;
  headers: { key: string; value: string }[];
  active: boolean;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  type: "PASSWORD_CHANGE" | "PIN_CHANGE" | "TWO_FACTOR_ENABLE" | "TWO_FACTOR_DISABLE";
  description: string;
  simulatedIp: string;
  createdAt: string;
}

export type NotificationType =
  | "CHARGE_PAID"
  | "WITHDRAWAL_COMPLETED"
  | "APPROVAL_PENDING"
  | "OPERATION_FAILED";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface Preferences {
  density: "comfortable" | "compact";
  hideValues: boolean;
  reduceMotion: boolean;
}

// --- SESSÃO & CADASTRO ---
export type SessionStatus =
  | "LOADING"
  | "UNAUTHENTICATED"
  | "AUTHENTICATED"
  | "ERROR";

export type AccountRegistrationStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTING"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export interface OnboardingFormData {
  // Etapa 1: Responsável
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  roleInCompany: "SOCIO" | "DIRETOR" | "PROCURADOR" | "OUTRO";
  roleOther?: string;

  // Etapa 2: Empresa
  cnpj: string;
  legalName?: string;
  tradeName?: string;
  businessSegment:
    | "ECOMMERCE"
    | "SAAS"
    | "MARKETPLACE"
    | "SERVICOS"
    | "FINTECH"
    | "OUTRO";
  segmentOther?: string;
  companySize: "1-10" | "11-50" | "51-200" | "200+";
  website?: string;

  // Operação (opcional)
  estimatedMonthlyVolume?:
    | "ATE_100K"
    | "100K_A_500K"
    | "500K_A_2M"
    | "2M_A_10M"
    | "ACIMA_10M";
  averageTicket?:
    | "ATE_50"
    | "50_A_200"
    | "200_A_1000"
    | "ACIMA_1000";
  pixUsageType?: "COBRANCA_RECEBIMENTO" | "PAGAMENTO_SAQUE" | "AMBOS";
  integrationChannel?: "API" | "PAINEL" | "AMBOS";
  businessDescription?: string;
  notes?: string;

  // Acesso
  accessEmail: string;
  password?: string;
  confirmPassword?: string;

  // Declaração
  declarationAccepted: boolean;
}

// ==========================================
// SUPERADMIN DOMAIN ENTITIES & CONTRACTS
// ==========================================

export type CompanyStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type AccountOperationalStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type ApplicationStatus =
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED";

export interface Company {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  cnpjMasked: string;
  status: CompanyStatus;
  segment: string;
  companySize: string;
  website?: string;
  responsibleName: string;
  responsibleCpf: string;
  responsibleEmail: string;
  responsiblePhone: string;
  roleInCompany: string;
  createdAt: string;
  updatedAt: string;
  accountCount: number;
  activeAccountCount: number;
  totalVolumeInCents: number;
  suspensionReason?: string;
}

export interface ApplicationHistoryEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  action: string;
  description: string;
  fromStatus?: ApplicationStatus;
  toStatus?: ApplicationStatus;
}

export interface AccountApplication {
  id: string;
  companyId?: string;
  companyName: string;
  tradeName?: string;
  cnpj: string;
  cnpjMasked: string;
  responsibleName: string;
  responsibleCpf: string;
  responsibleEmail: string;
  responsiblePhone: string;
  roleInCompany: string;
  roleOther?: string;
  segment: string;
  companySize: string;
  website?: string;
  estimatedMonthlyVolume?: string;
  averageTicket?: string;
  pixUsageType?: string;
  integrationChannel?: string;
  businessDescription?: string;
  status: ApplicationStatus;
  assignedAnalystId?: string;
  assignedAnalystName?: string;
  submittedAt: string;
  updatedAt: string;
  decidedAt?: string;
  reopenedAt?: string;
  rejectionReason?: string;
  internalNotes?: string;
  clientInstructions?: string;
  requestedAdjustmentFields?: string[];
  history: ApplicationHistoryEntry[];
  checklist: {
    dataComplete: boolean;
    documentCoherence: boolean;
    complianceCleared: boolean;
    policyAgreed: boolean;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "SUPERADMIN" | "ONBOARDING_ANALYST" | "OPERATIONS" | "SUPPORT" | "AUDITOR";
  status: "ACTIVE" | "DEACTIVATED";
  scope: "GLOBAL" | "ASSIGNED";
  assignedCompanyIds?: string[];
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  entityType:
    | "COMPANY"
    | "ACCOUNT"
    | "APPLICATION"
    | "OPERATION"
    | "FEE_LIMIT"
    | "RULE"
    | "WEBHOOK"
    | "USER"
    | "PLATFORM"
    | "APPROVAL_REQUEST"
    | "SECURITY";
  entityId: string;
  companyId?: string;
  companyName?: string;
  accountId?: string;
  reason?: string;
  diffSanitized?: Record<string, { before: any; after: any }>;
  status: "SUCCESS" | "FAILED";
}

export interface PricingPolicy {
  id: string;
  scope: "GLOBAL" | "COMPANY" | "ACCOUNT";
  targetId?: string;
  targetName?: string;
  inflowFeePercentage: number;
  inflowFeeFixedInCents: number;
  outflowFeePercentage: number;
  outflowFeeFixedInCents: number;
  effectiveFrom: string;
  updatedAt: string;
  updatedBy: string;
  reason: string;
}

export interface LimitPolicy {
  id: string;
  scope: "GLOBAL" | "COMPANY" | "ACCOUNT";
  targetId?: string;
  targetName?: string;
  transactionLimitInCents: number;
  dailyLimitInCents: number;
  nightlyLimitInCents: number;
  effectiveFrom: string;
  updatedAt: string;
  updatedBy: string;
  reason: string;
}

export interface AdminFilterState {
  period?:
    | "TODAY"
    | "YESTERDAY"
    | "LAST_7_DAYS"
    | "LAST_30_DAYS"
    | "THIS_MONTH"
    | "LAST_MONTH"
    | "CUSTOM"
    | "ALL";
  customStartDate?: string;
  customEndDate?: string;
  startDate?: string;
  endDate?: string;
  dateField?: string;
  companyId?: string;
  companyIds?: string[];
  accountId?: string;
  accountIds?: string[];
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PendingTaskSummary {
  pendingApplicationsCount: number;
  oldestApplicationDays?: number;
  pendingAdjustmentsCount?: number;
  changesRequestedCount?: number;
  pendingFinancialApprovalsCount: number;
  pendingBatchesCount?: number;
  failedDeliveriesCount?: number;
  suspendedCompaniesCount?: number;
  totalUrgentTasks?: number;
}
