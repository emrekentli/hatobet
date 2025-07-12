import { format, formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";

// Istanbul timezone constant
export const ISTANBUL_TIMEZONE = "Europe/Istanbul";

// Convert date to Istanbul timezone
export function toIstanbulTime(date: Date | string): Date {
  const dateObj = new Date(date);
  const istanbulDate = new Date(dateObj.toLocaleString("en-US", { timeZone: ISTANBUL_TIMEZONE }));
  return istanbulDate;
}

// Format date in Istanbul timezone
export function formatDate(date: Date | string, dateFormat: string = "dd.MM.yyyy HH:mm") {
  return formatInTimeZone(new Date(date), ISTANBUL_TIMEZONE, dateFormat, { locale: tr });
}

// Get current date in Istanbul timezone
export function getCurrentIstanbulDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: ISTANBUL_TIMEZONE }));
}
