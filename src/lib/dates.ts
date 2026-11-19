import { brandConfig } from "@/config/brand.config";

const TIMEZONE = brandConfig.timezone; // "America/Sao_Paulo"

/**
 * Formata data e hora no fuso horário do Brasil (America/Sao_Paulo)
 */
export function formatDateTime(
  dateInput: string | Date | number,
  formatStyle: "short" | "medium" | "full" | "time-only" | "date-only" = "medium"
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Data inválida";

  switch (formatStyle) {
    case "date-only":
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? "UTC" : TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);

    case "time-only":
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);

    case "short":
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);

    case "full":
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: TIMEZONE,
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);

    case "medium":
    default:
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
  }
}

/**
 * Retorna tempo relativo amigável (ex: "há 10 min", "em 45 min", "expirado")
 */
export function formatTimeRemaining(expiresAt: string | Date, now: Date = new Date()): {
  text: string;
  isExpired: boolean;
  minutesLeft: number;
} {
  const target = new Date(expiresAt).getTime();
  const current = now.getTime();
  const diffMs = target - current;

  if (diffMs <= 0) {
    return {
      text: "Expirada",
      isExpired: true,
      minutesLeft: 0,
    };
  }

  const minutesLeft = Math.floor(diffMs / (1000 * 60));
  const hoursLeft = Math.floor(minutesLeft / 60);

  if (hoursLeft > 0) {
    const remMin = minutesLeft % 60;
    return {
      text: `${hoursLeft}h ${remMin}m restantes`,
      isExpired: false,
      minutesLeft,
    };
  }

  return {
    text: `${minutesLeft} min restantes`,
    isExpired: false,
    minutesLeft,
  };
}

/**
 * Retorna tempo relativo decorrido amigável (ex: "há 10 min", "ontem", "há 3 dias")
 */
export function formatRelativeTime(
  dateInput: string | Date | number,
  now: Date = new Date()
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Data inválida";
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `há ${diffDays} dias`;
  return formatDateTime(date, "short");
}
