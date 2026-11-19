import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountOpeningScreen } from "@/features/account-validation/components/account-opening-screen";
import { accountOpeningApplicationSchema, type OpeningApplication } from "@/features/account-validation/account-opening-application";
import { accountOpeningPath, needsAccountOpening } from "@/lib/auth-navigation";
import { requestBackend } from "@/lib/server/auth-backend";
import { accessCookie, requireSession } from "@/lib/server/session";

export const metadata: Metadata = { title: "Abertura de conta" };

export default async function AccountOpeningPage() {
  const user = await requireSession(accountOpeningPath, { operations: true, allowOpening: true });
  if (user.role !== "MERCHANT") redirect(user.role === "ADMIN" ? "/admin" : "/inicio");

  const accessToken = (await cookies()).get(accessCookie)?.value;
  let initial: OpeningApplication | undefined;
  let applicationMissing = false;
  try {
    const response = await requestBackend("/account-opening/application", { method: "GET", accessToken });
    applicationMissing = response.status === 404;
    const application = response.ok ? accountOpeningApplicationSchema.safeParse(await response.json()) : null;
    if (application?.success) initial = application.data;
    else if (!response.ok) await response.body?.cancel();
  } catch {
    // The client retries independently while keeping the session monitor active.
  }
  if (applicationMissing && !needsAccountOpening(user)) redirect("/inicio");

  return <AccountOpeningScreen merchantId={user.id} initial={initial} />;
}
