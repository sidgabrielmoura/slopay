import { z } from "zod";

export const adminDatePeriod = z.enum(["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH", "ALL"]);
export const adminDatePeriodLabels: Record<z.infer<typeof adminDatePeriod>, string> = {
  TODAY: "Hoje", YESTERDAY: "Ontem", LAST_7_DAYS: "Últimos 7 dias", LAST_30_DAYS: "Últimos 30 dias",
  THIS_MONTH: "Este mês", LAST_MONTH: "Mês anterior", ALL: "Todo o período",
};
