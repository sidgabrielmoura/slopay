import type { Metadata } from "next";
import { AccountOpeningScreen } from "@/features/account-validation/components/account-opening-screen";

export const metadata: Metadata = { title: "Abertura de conta" };

export default function AccountOpeningDemoPage() {
  return <AccountOpeningScreen demo merchantId="demo-account-opening" initial={{
    owner: { name: "Marina Costa", cpf: "52998224725", email: "marina@example.com", phone: "+5511999999999" },
    state: "DRAFT", draft: null, nextStep: 1, version: 0, submittedAt: null, decidedAt: null, reason: null,
  }} />;
}
