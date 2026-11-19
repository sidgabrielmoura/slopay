import { z } from "zod";

export const indicatorsPath = "/indicadores";
export const indicatorPeriods = ["7d", "30d", "90d"] as const;
export const indicatorPeriodSchema = z.enum(indicatorPeriods);
export type IndicatorPeriod = z.infer<typeof indicatorPeriodSchema>;
export const defaultIndicatorPeriod = "30d" satisfies IndicatorPeriod;
export const indicatorsUnavailable = "Os indicadores estão temporariamente indisponíveis.";

export const periodDays: Record<IndicatorPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };
export const periodLabels: Record<IndicatorPeriod, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
};

const nonnegative = z.int().nonnegative();
export const indicatorDaySchema = z.object({
  date: z.iso.date(),
  receivedCents: nonnegative,
  withdrawnCents: nonnegative,
  receivedCount: nonnegative,
  withdrawnCount: nonnegative,
});
export type IndicatorDay = z.infer<typeof indicatorDaySchema>;

export function summarizeIndicatorDays(days: IndicatorDay[]) {
  return days.reduce((total, day) => ({
    receivedCents: total.receivedCents + day.receivedCents,
    withdrawnCents: total.withdrawnCents + day.withdrawnCents,
    receivedCount: total.receivedCount + day.receivedCount,
    withdrawnCount: total.withdrawnCount + day.withdrawnCount,
  }), { receivedCents: 0, withdrawnCents: 0, receivedCount: 0, withdrawnCount: 0 });
}

export const indicatorReportSchema = z.object({
  environment: z.enum(["live", "sandbox", "demo"]),
  period: indicatorPeriodSchema,
  days: z.array(indicatorDaySchema).min(7).max(90),
  charges: z.object({ paid: nonnegative, open: nonnegative, closed: nonnegative }),
}).refine((report) => {
  const totals = summarizeIndicatorDays(report.days);
  return report.days.length === periodDays[report.period] &&
    Object.values(totals).every(Number.isSafeInteger) &&
    Number.isSafeInteger(totals.receivedCount + totals.withdrawnCount) &&
    Number.isSafeInteger(report.charges.paid + report.charges.open + report.charges.closed);
});
export type IndicatorReport = z.infer<typeof indicatorReportSchema>;
