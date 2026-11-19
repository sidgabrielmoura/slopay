import { redirect } from "next/navigation";
import { approvalRulesPath } from "@/features/approval-rules/approval-rules";

export default function NewApprovalRulePage() {
  redirect(approvalRulesPath);
}
