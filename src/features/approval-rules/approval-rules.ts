import type { ApprovalRule, ApprovalRuleType, User } from "@/types/domain";

export const approvalRulesPath = "/conta/regras-de-aprovacao";
export const newApprovalRulePath = approvalRulesPath + "/nova";

export const approvalRuleTypes = {
  PARALLEL: { label: "Paralela", description: "As pessoas selecionadas podem decidir em qualquer ordem." },
  SEQUENTIAL: { label: "Sequencial", description: "As decisões seguem a ordem da lista até atingir o quórum." },
} satisfies Record<ApprovalRuleType, { label: string; description: string }>;

export const maxRequiredApprovals = 5;

export type ApprovalRuleValues = Omit<ApprovalRule, "id" | "createdAt">;
export type ApprovalRuleMember = Pick<User, "id" | "name" | "role"> & { eligible: boolean };

export function isEligibleApprover(user: User) {
  return user.status === "ACTIVE" && (user.role === "APROVADOR" || user.role === "TITULAR") &&
    user.permissions.approvals.decide;
}

export function findApplicableApprovalRule(rules: readonly ApprovalRule[], amountInCents: number) {
  let match: ApprovalRule | undefined;
  for (const rule of rules) {
    if (rule.active && rule.minAmountInCents <= amountInCents &&
      (!match || rule.minAmountInCents > match.minAmountInCents)) match = rule;
  }
  return match;
}

export function approvalRuleError(rule: ApprovalRuleValues) {
  if (!rule.name.trim()) return { field: "name", message: "Informe o nome da regra." } as const;
  if (!Number.isSafeInteger(rule.minAmountInCents) || rule.minAmountInCents < 0) {
    return { field: "amount", message: "Informe um valor mínimo válido em reais." } as const;
  }
  if (!Object.hasOwn(approvalRuleTypes, rule.ruleType)) {
    return { field: "type", message: "Selecione um tipo de aprovação válido." } as const;
  }
  const eligibleCount = new Set(rule.eligibleApproverIds).size;
  if (!eligibleCount || eligibleCount !== rule.eligibleApproverIds.length) {
    return { field: "approvers", message: "Selecione um ou mais aprovadores distintos." } as const;
  }
  const quorum = rule.requiredApprovalsCount;
  if (!Number.isInteger(quorum) || quorum < 1 || quorum > Math.min(eligibleCount, maxRequiredApprovals)) {
    return { field: "quorum", message: "O quórum deve estar entre 1 e o número de aprovadores selecionados, até 5." } as const;
  }
}
