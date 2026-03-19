import { db } from "@/lib/db";
import type { ExchangeRates } from "@/types/currency";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const BASE_URL = "https://api.frankfurter.app";

export async function fetchRates(
  base: string,
  date: string = "latest"
): Promise<ExchangeRates> {
  // Check DB cache
  const cached = await db.exchangeRateCache.findUnique({
    where: { baseCurrency_date: { baseCurrency: base, date } },
  });
  if (
    cached &&
    (date !== "latest" ||
      Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS)
  ) {
    return {
      base,
      date: cached.date,
      rates: cached.rates as Record<string, number>,
    };
  }

  // Fetch from Frankfurter
  const url =
    date === "latest"
      ? `${BASE_URL}/latest?from=${base}`
      : `${BASE_URL}/${date}?from=${base}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  const data = await res.json();

  // Upsert cache
  await db.exchangeRateCache.upsert({
    where: { baseCurrency_date: { baseCurrency: base, date } },
    create: {
      baseCurrency: base,
      date: data.date ?? date,
      rates: data.rates,
      fetchedAt: new Date(),
    },
    update: { rates: data.rates, fetchedAt: new Date() },
  });

  return { base, date: data.date ?? date, rates: data.rates };
}
