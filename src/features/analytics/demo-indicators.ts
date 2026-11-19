import { brandConfig } from "@/config/brand.config";
import type { Charge, Transaction } from "@/types/domain";
import { periodDays, type IndicatorDay, type IndicatorPeriod, type IndicatorReport } from "./indicators";

const dayMs = 24 * 60 * 60_000;
const localDate = new Intl.DateTimeFormat("en-US", {
  timeZone: brandConfig.timezone, year: "numeric", month: "2-digit", day: "2-digit",
});

function dateKey(instant: string | Date) {
  const parts = Object.fromEntries(localDate.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function demoIndicators(period: IndicatorPeriod, now: Date, transactions: Transaction[], charges: Charge[]): IndicatorReport {
  const today = Date.parse(dateKey(now));
  const days = new Map<string, IndicatorDay>();
  for (let offset = periodDays[period] - 1; offset >= 0; offset--) {
    const date = new Date(today - offset * dayMs).toISOString().slice(0, 10);
    days.set(date, { date, receivedCents: 0, withdrawnCents: 0, receivedCount: 0, withdrawnCount: 0 });
  }
  for (const transaction of transactions) {
    if (transaction.status !== "COMPLETED" || !transaction.settledAt) continue;
    const day = days.get(dateKey(transaction.settledAt));
    if (!day) continue;
    if (transaction.type === "PIX_RECEIVE") {
      day.receivedCents += transaction.totalDebitedInCents;
      day.receivedCount++;
    } else if (transaction.type === "PIX_WITHDRAW" || transaction.type === "BATCH_ITEM") {
      day.withdrawnCents += transaction.amountInCents;
      day.withdrawnCount++;
    }
  }
  const counts = { paid: 0, open: 0, closed: 0 };
  for (const charge of charges) {
    if (!days.has(dateKey(charge.createdAt)) || charge.status === "DRAFT") continue;
    if (charge.status === "PAID") counts.paid++;
    else if (charge.status === "PENDING") counts.open++;
    else counts.closed++;
  }
  return { environment: "demo", period, days: Array.from(days.values()), charges: counts };
}
