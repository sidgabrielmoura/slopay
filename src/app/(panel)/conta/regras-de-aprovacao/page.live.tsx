import { redirect } from "next/navigation";

export default function ApprovalRulesPage() {
  redirect("/aprovacoes?regras=1");
}
