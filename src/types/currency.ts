export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}
