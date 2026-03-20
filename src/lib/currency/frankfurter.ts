import { db } from "@/lib/db";
import type { ExchangeRates } from "@/types/currency";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours; upstream updates daily
const BASE_URL = "https://api.frankfurter.app";

function isCacheFresh(cached: { fetchedAt: Date }, date: string): boolean {
  return date !== "latest" || Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;
}

function toExchangeRates(
  base: string,
  date: string,
  rates: unknown
): ExchangeRates {
  return {
    base,
    date,
    rates: rates as Record<string, number>,
  };
}

async function fetchAndCacheRates(
  base: string,
  date: string
): Promise<ExchangeRates> {
  const url =
    date === "latest"
      ? `${BASE_URL}/latest?from=${base}`
      : `${BASE_URL}/${date}?from=${base}`;
  const res = await fetch(url, { next: { revalidate: CACHE_TTL_MS / 1000 } });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);

  const data = await res.json();
  const fetchedAt = new Date();
  const effectiveDate = data.date ?? date;

  if (date === "latest") {
    const writes = [
      db.exchangeRateCache.upsert({
        where: { baseCurrency_date: { baseCurrency: base, date: "latest" } },
        create: {
          baseCurrency: base,
          date: "latest",
          rates: data.rates,
          fetchedAt,
        },
        update: { rates: data.rates, fetchedAt },
      }),
    ];

    if (effectiveDate !== "latest") {
      writes.push(
        db.exchangeRateCache.upsert({
          where: {
            baseCurrency_date: { baseCurrency: base, date: effectiveDate },
          },
          create: {
            baseCurrency: base,
            date: effectiveDate,
            rates: data.rates,
            fetchedAt,
          },
          update: { rates: data.rates, fetchedAt },
        })
      );
    }

    await db.$transaction(writes);
  } else {
    await db.exchangeRateCache.upsert({
      where: { baseCurrency_date: { baseCurrency: base, date } },
      create: {
        baseCurrency: base,
        date,
        rates: data.rates,
        fetchedAt,
      },
      update: { rates: data.rates, fetchedAt },
    });
  }

  return toExchangeRates(base, date, data.rates);
}

export async function fetchRates(
  base: string,
  date: string = "latest"
): Promise<ExchangeRates> {
  const cached = await db.exchangeRateCache.findUnique({
    where: { baseCurrency_date: { baseCurrency: base, date } },
    select: { date: true, rates: true, fetchedAt: true },
  });

  if (cached && isCacheFresh(cached, date)) {
    return toExchangeRates(base, cached.date, cached.rates);
  }

  return fetchAndCacheRates(base, date);
}

export async function fetchRatesMap(base: string, dates: string[]) {
  const uniqueDates = [...new Set(dates)];
  const ratesByDate = new Map<string, ExchangeRates>();

  if (uniqueDates.length === 0) {
    return { ratesByDate, staleDates: [] as string[] };
  }

  const cachedRates = await db.exchangeRateCache.findMany({
    where: {
      baseCurrency: base,
      date: { in: uniqueDates },
    },
    select: { date: true, rates: true, fetchedAt: true },
  });

  for (const cached of cachedRates) {
    if (isCacheFresh(cached, cached.date)) {
      ratesByDate.set(cached.date, toExchangeRates(base, cached.date, cached.rates));
    }
  }

  const missingDates = uniqueDates.filter((date) => !ratesByDate.has(date));
  const results = await Promise.all(
    missingDates.map(async (date) => {
      try {
        const rates = await fetchAndCacheRates(base, date);
        ratesByDate.set(date, rates);
        return null;
      } catch {
        return date;
      }
    })
  );

  return {
    ratesByDate,
    staleDates: results.filter((date): date is string => date !== null),
  };
}
