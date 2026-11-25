import { redirect } from "next/navigation";
import { transactionTabs } from "@/features/transactions/transaction-presentation";

export default function BuscarPage() {
  redirect(transactionTabs.ALL.path);
}
