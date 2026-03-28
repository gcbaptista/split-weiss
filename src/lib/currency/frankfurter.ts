import { db } from "@/lib/db";
import type { ExchangeRates } from "@/types/currency";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours; upstream updates daily
const BASE_URL = "https://api.frankfurter.dev/v2";

// ── Request deduplication ──────────────────────────────────────────
// If the same fetch is already in-flight, reuse that promise.

const inflight = new Map<string, Promise<ExchangeRates>>();

// ── Helpers ────────────────────────────────────────────────────────

function isCacheFresh(cached: { fetchedAt: Date }, date: string): boolean {
  return date !== "latest" || Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;
}

function toExchangeRates(base: string, date: string, rates: Record<string, number>): ExchangeRates {
  return { base, date, rates };
}

/**
 * Parse v2 array response into a rates-by-date map.
 * v2 returns: [{ date, base, quote, rate }, ...]
 */
function parseV2Response(
  data: Array<{ date: string; base: string; quote: string; rate: number }>
): Map<string, Record<string, number>> {
  const byDate = new Map<string, Record<string, number>>();
  for (const entry of data) {
    let rates = byDate.get(entry.date);
    if (!rates) {
      rates = {};
      byDate.set(entry.date, rates);
    }
    rates[entry.quote] = entry.rate;
  }
  return byDate;
}

// ── Single-date fetch with dedup ───────────────────────────────────

async function _doFetchLatest(base: string): Promise<ExchangeRates> {
  const res = await fetch(`${BASE_URL}/rates?base=${base}`, {
    next: { revalidate: CACHE_TTL_MS / 1000 },
  });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);

  const data = await res.json();
  const fetchedAt = new Date();
  const byDate = parseV2Response(data);

  // v2 latest can return multiple dates — use the most recent one
  const sortedDates = [...byDate.keys()].sort();
  const latestDate = sortedDates[sortedDates.length - 1];
  const rates = latestDate ? byDate.get(latestDate) : undefined;
  if (!latestDate || !rates) throw new Error("No rates returned");

  // Cache under both "latest" and the actual date, plus any other dates returned
  const writes = [
    db.exchangeRateCache.upsert({
      where: { baseCurrency_date: { baseCurrency: base, date: "latest" } },
      create: { baseCurrency: base, date: "latest", rates, fetchedAt },
      update: { rates, fetchedAt },
    }),
  ];
  for (const [date, dateRates] of byDate) {
    writes.push(
      db.exchangeRateCache.upsert({
        where: { baseCurrency_date: { baseCurrency: base, date } },
        create: { baseCurrency: base, date, rates: dateRates, fetchedAt },
        update: { rates: dateRates, fetchedAt },
      })
    );
  }
  await db.$transaction(writes);

  return toExchangeRates(base, "latest", rates);
}

async function _doFetchDate(base: string, date: string): Promise<ExchangeRates> {
  const res = await fetch(`${BASE_URL}/rates?base=${base}&date=${date}`, {
    next: { revalidate: CACHE_TTL_MS / 1000 },
  });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);

  const data = await res.json();
  const fetchedAt = new Date();
  const byDate = parseV2Response(data);

  // v2 can return multiple dates — find the requested date, or closest
  const rates = byDate.get(date);
  const fallbackDate = [...byDate.keys()].sort().pop();
  const effectiveRates = rates ?? (fallbackDate ? byDate.get(fallbackDate) : undefined);
  if (!effectiveRates) throw new Error("No rates returned");

  // Cache all returned dates
  const writes = [...byDate.entries()].map(([d, r]) =>
    db.exchangeRateCache.upsert({
      where: { baseCurrency_date: { baseCurrency: base, date: d } },
      create: { baseCurrency: base, date: d, rates: r, fetchedAt },
      update: { rates: r, fetchedAt },
    })
  );
  // Also cache under the originally requested date if not already present
  if (!byDate.has(date)) {
    writes.push(
      db.exchangeRateCache.upsert({
        where: { baseCurrency_date: { baseCurrency: base, date } },
        create: { baseCurrency: base, date, rates: effectiveRates, fetchedAt },
        update: { rates: effectiveRates, fetchedAt },
      })
    );
  }
  await db.$transaction(writes);

  return toExchangeRates(base, date, effectiveRates);
}

/** Deduplicated single-date fetch. */
function fetchAndCacheRates(base: string, date: string): Promise<ExchangeRates> {
  const key = `${base}:${date}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (date === "latest" ? _doFetchLatest(base) : _doFetchDate(base, date)).finally(
    () => inflight.delete(key)
  );
  inflight.set(key, promise);
  return promise;
}

// ── Time series fetch (single request for a date range) ────────────

async function fetchAndCacheRange(
  base: string,
  fromDate: string,
  toDate: string,
  neededDates: string[]
): Promise<Map<string, ExchangeRates>> {
  const res = await fetch(`${BASE_URL}/rates?base=${base}&from=${fromDate}&to=${toDate}`, {
    next: { revalidate: CACHE_TTL_MS / 1000 },
  });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);

  const data = await res.json();
  const fetchedAt = new Date();
  const byDate = parseV2Response(data);
  const result = new Map<string, ExchangeRates>();
  const neededSet = new Set(neededDates);

  // Only cache the dates we actually need, not every date in the range
  const writes: ReturnType<typeof db.exchangeRateCache.upsert>[] = [];
  for (const [date, rates] of byDate) {
    if (neededSet.has(date)) {
      result.set(date, toExchangeRates(base, date, rates));
      writes.push(
        db.exchangeRateCache.upsert({
          where: { baseCurrency_date: { baseCurrency: base, date } },
          create: { baseCurrency: base, date, rates, fetchedAt },
          update: { rates, fetchedAt },
        })
      );
    }
  }

  // For needed dates not in the response (weekends/holidays), use the closest prior date
  for (const needed of neededDates) {
    if (!result.has(needed)) {
      const sortedDates = [...byDate.keys()].sort();
      const closest = sortedDates.filter((d) => d <= needed).pop() ?? sortedDates[0];
      const rates = closest ? byDate.get(closest) : undefined;
      if (rates) {
        result.set(needed, toExchangeRates(base, needed, rates));
        writes.push(
          db.exchangeRateCache.upsert({
            where: { baseCurrency_date: { baseCurrency: base, date: needed } },
            create: { baseCurrency: base, date: needed, rates, fetchedAt },
            update: { rates, fetchedAt },
          })
        );
      }
    }
  }

  if (writes.length > 0) {
    await db.$transaction(writes);
  }

  return result;
}

// ── Public API ─────────────────────────────────────────────────────

export async function fetchRates(base: string, date: string = "latest"): Promise<ExchangeRates> {
  const cached = await db.exchangeRateCache.findUnique({
    where: { baseCurrency_date: { baseCurrency: base, date } },
    select: { date: true, rates: true, fetchedAt: true },
  });

  if (cached && isCacheFresh(cached, date)) {
    return toExchangeRates(base, cached.date, cached.rates as Record<string, number>);
  }

  return fetchAndCacheRates(base, date);
}

export async function fetchRatesMap(base: string, dates: string[]) {
  const uniqueDates = [...new Set(dates)];
  const ratesByDate = new Map<string, ExchangeRates>();

  if (uniqueDates.length === 0) {
    return { ratesByDate, staleDates: [] as string[] };
  }

  // Check cache for all requested dates
  const cachedRates = await db.exchangeRateCache.findMany({
    where: { baseCurrency: base, date: { in: uniqueDates } },
    select: { date: true, rates: true, fetchedAt: true },
  });

  for (const cached of cachedRates) {
    if (isCacheFresh(cached, cached.date)) {
      ratesByDate.set(
        cached.date,
        toExchangeRates(base, cached.date, cached.rates as Record<string, number>)
      );
    }
  }

  // Split missing dates into "latest" (single fetch) and historical (time series)
  const missingDates = uniqueDates.filter((d) => !ratesByDate.has(d));
  if (missingDates.length === 0) {
    return { ratesByDate, staleDates: [] as string[] };
  }

  const needsLatest = missingDates.includes("latest");
  const historicalMissing = missingDates.filter((d) => d !== "latest");

  // Build fetch promises
  const fetches: Promise<void>[] = [];

  if (needsLatest) {
    fetches.push(
      fetchAndCacheRates(base, "latest")
        .then((r) => {
          ratesByDate.set("latest", r);
        })
        .catch((e) => {
          console.warn("[fetchRatesMap] latest fetch failed:", e);
        })
    );
  }

  if (historicalMissing.length === 1) {
    // Single date — use the single-date endpoint (deduped)
    const date = historicalMissing[0]!;
    fetches.push(
      fetchAndCacheRates(base, date)
        .then((r) => {
          ratesByDate.set(date, r);
        })
        .catch((e) => {
          console.warn(`[fetchRatesMap] fetch ${date} failed:`, e);
        })
    );
  } else if (historicalMissing.length > 1) {
    // Multiple dates — use time series (1 request for the whole range)
    const sorted = historicalMissing.sort();
    const from = sorted[0]!;
    const to = sorted[sorted.length - 1]!;
    fetches.push(
      fetchAndCacheRange(base, from, to, historicalMissing)
        .then((rangeMap) => {
          for (const [date, rates] of rangeMap) {
            ratesByDate.set(date, rates);
          }
        })
        .catch((e) => {
          console.warn(`[fetchRatesMap] range ${from}..${to} failed:`, e);
        })
    );
  }

  await Promise.all(fetches);

  const staleDates = missingDates.filter((d) => !ratesByDate.has(d));
  return { ratesByDate, staleDates };
}
