export const CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF",
  "RON", "BGN", "BRL", "CAD", "AUD", "NZD", "JPY", "CNY", "INR", "KRW",
  "SGD", "HKD", "THB", "MYR", "IDR", "PHP", "TRY", "ZAR", "MXN", "ARS",
  "AED", "SAR", "QAR", "ILS", "PKR", "BDT", "TWD", "UAH", "RUB", "ISK",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_NAMES: Record<string, string> = {
  EUR: "Euro",
  USD: "US Dollar",
  GBP: "British Pound",
  CHF: "Swiss Franc",
  JPY: "Japanese Yen",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  PLN: "Polish Zloty",
  CZK: "Czech Koruna",
  HUF: "Hungarian Forint",
  BRL: "Brazilian Real",
  INR: "Indian Rupee",
  CNY: "Chinese Yuan",
  KRW: "South Korean Won",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  TRY: "Turkish Lira",
  ZAR: "South African Rand",
  MXN: "Mexican Peso",
  ARS: "Argentine Peso",
  NZD: "New Zealand Dollar",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
};

export const DEFAULT_CURRENCY = "EUR";
