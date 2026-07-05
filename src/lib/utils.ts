import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object using a fixed locale ("en-US") to avoid
 * server/client hydration mismatches caused by locale differences.
 */
/**
 * Format a date string or Date object using a fixed locale ("en-US") to avoid
 * server/client hydration mismatches caused by locale differences.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", options);
}

/**
 * Format a date+time string or Date object using a fixed locale ("en-US").
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US");
}

/**
 * Sanitize free-typed numeric input into a plain decimal string.
 * Treats "," as a decimal separator (common on non-US iOS keyboards, where
 * the decimal key inserts a comma instead of a period) and strips any other
 * non-digit characters, keeping only the first decimal point found.
 */
export function sanitizeDecimalInput(raw: string): string {
  return raw
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "")
    .replace(/^(\d*\.?\d*).*$/, "$1");
}

export function formatCurrency(amount: string | number, currency: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0.00 ${currency}`;
  try {
    // Use a fixed locale to avoid server/client formatting mismatches.
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}
