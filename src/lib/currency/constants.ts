interface CurrencyInfo {
  name: string;
  symbol: string;
}

/**
 * Single source of truth for all supported currencies.
 */
export const CURRENCY_DATA = {
  EUR: { name: "Euro", symbol: "€" },
  USD: { name: "US Dollar", symbol: "$" },
  GBP: { name: "British Pound", symbol: "£" },
  CHF: { name: "Swiss Franc", symbol: "Fr" },
  SEK: { name: "Swedish Krona", symbol: "kr" },
  NOK: { name: "Norwegian Krone", symbol: "kr" },
  DKK: { name: "Danish Krone", symbol: "kr" },
  PLN: { name: "Polish Zloty", symbol: "zł" },
  CZK: { name: "Czech Koruna", symbol: "Kč" },
  HUF: { name: "Hungarian Forint", symbol: "Ft" },
  RON: { name: "Romanian Leu", symbol: "lei" },
  BGN: { name: "Bulgarian Lev", symbol: "лв" },
  BRL: { name: "Brazilian Real", symbol: "R$" },
  CAD: { name: "Canadian Dollar", symbol: "$" },
  AUD: { name: "Australian Dollar", symbol: "$" },
  NZD: { name: "New Zealand Dollar", symbol: "$" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  INR: { name: "Indian Rupee", symbol: "₹" },
  KRW: { name: "South Korean Won", symbol: "₩" },
  SGD: { name: "Singapore Dollar", symbol: "$" },
  HKD: { name: "Hong Kong Dollar", symbol: "$" },
  THB: { name: "Thai Baht", symbol: "฿" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp" },
  PHP: { name: "Philippine Peso", symbol: "₱" },
  TRY: { name: "Turkish Lira", symbol: "₺" },
  ZAR: { name: "South African Rand", symbol: "R" },
  MXN: { name: "Mexican Peso", symbol: "$" },
  ARS: { name: "Argentine Peso", symbol: "$" },
  AED: { name: "UAE Dirham", symbol: "د.إ" },
  SAR: { name: "Saudi Riyal", symbol: "﷼" },
  QAR: { name: "Qatari Riyal", symbol: "﷼" },
  ILS: { name: "Israeli Shekel", symbol: "₪" },
  PKR: { name: "Pakistani Rupee", symbol: "₨" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳" },
  TWD: { name: "New Taiwan Dollar", symbol: "NT$" },
  UAH: { name: "Ukrainian Hryvnia", symbol: "₴" },
  RUB: { name: "Russian Ruble", symbol: "₽" },
  ISK: { name: "Icelandic Króna", symbol: "kr" },
} as const satisfies Record<string, CurrencyInfo>;

export type Currency = keyof typeof CURRENCY_DATA;

/** Ordered list of currency codes. */
export const CURRENCIES = Object.keys(CURRENCY_DATA) as Currency[];

export const DEFAULT_CURRENCY: Currency = "EUR";

// Derived lookup maps for consumers that need flat access
export const CURRENCY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_DATA).map(([code, info]) => [code, info.name])
);

export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  Object.entries(CURRENCY_DATA).map(([code, info]) => [code, info.symbol])
);
