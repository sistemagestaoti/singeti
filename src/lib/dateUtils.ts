export const APP_TIMEZONE = "America/Sao_Paulo";

function toValidDate(dateVal?: string | Date | number | null): Date | null {
  if (dateVal === undefined || dateVal === null || dateVal === "") return null;
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Formata data e hora completa em horário de Brasília (ex: "29/10/2026, 13:19" ou com segundos)
 */
export function formatDateTimeBR(
  dateVal?: string | Date | number | null,
  includeSeconds = false
): string {
  const d = toValidDate(dateVal);
  if (!d) return "-";
  try {
    return d.toLocaleString("pt-BR", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(includeSeconds ? { second: "2-digit" } : {}),
    });
  } catch {
    return "-";
  }
}

/**
 * Formata apenas a data em horário de Brasília (ex: "29/10/2026")
 */
export function formatDateBR(dateVal?: string | Date | number | null): string {
  const d = toValidDate(dateVal);
  if (!d) return "-";
  try {
    return d.toLocaleDateString("pt-BR", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

/**
 * Formata apenas o horário (HH:mm) em horário de Brasília (ex: "13:19")
 */
export function formatTimeBR(
  dateVal?: string | Date | number | null,
  includeSeconds = false
): string {
  const d = toValidDate(dateVal);
  if (!d) return "-";
  try {
    return d.toLocaleTimeString("pt-BR", {
      timeZone: APP_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      ...(includeSeconds ? { second: "2-digit" } : {}),
    });
  } catch {
    return "-";
  }
}

/**
 * Formata data curta e hora para listagens compactas (ex: "29/10, 13:19")
 */
export function formatShortDateTimeBR(dateVal?: string | Date | number | null): string {
  const d = toValidDate(dateVal);
  if (!d) return "-";
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(d);
    const day = parts.find((p) => p.type === "day")?.value || "00";
    const month = parts.find((p) => p.type === "month")?.value || "00";
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${day}/${month}, ${hour}:${minute}`;
  } catch {
    return "-";
  }
}

/**
 * Formata data por extenso em português no fuso de Brasília (ex: "Quinta-feira, 29 de outubro de 2026")
 */
export function formatLongDateBR(dateVal?: string | Date | number | null): string {
  const d = toValidDate(dateVal) || new Date();
  try {
    const raw = d.toLocaleDateString("pt-BR", {
      timeZone: APP_TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return "";
  }
}

/**
 * Retorna YYYY-MM-DD no fuso de Brasília (evita virada de dia antecipada às 21h por causa do UTC)
 */
export function formatYMDInBrazil(dateVal?: string | Date | number | null): string {
  const d = toValidDate(dateVal) || new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value || "2026";
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    return `${year}-${month}-${day}`;
  } catch {
    return d.toISOString().split("T")[0];
  }
}

/**
 * Retorna o Date correspondente a 00:00:00 de hoje no fuso de Brasília (UTC-03:00)
 */
export function getStartOfTodayBrazil(): Date {
  const ymd = formatYMDInBrazil(new Date());
  return new Date(`${ymd}T00:00:00-03:00`);
}
