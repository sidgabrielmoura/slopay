import { redirect } from "next/navigation";

export default function NewApprovalRulePage() {
  redirect("/aprovacoes?regras=1");
}
