export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ConversionResult {
  amount: string;
  from: string;
  to: string;
  rate: number;
}
